// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;
pragma abicoder v2;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

contract ARBY is FlashLoanSimpleReceiverBase {
    address payable owner;
    uint256 public tokenOutInitialBalance;
    uint256 public tokenOutBalance;
    uint256 public tradeableAmount;

    struct Trade {
        address router;
        address tokenIn;
        address tokenOut;
        uint256 amountOutMinimum;
        uint160 sqrtX96;
        uint24 poolFee;
        bool v3;
    }
    
    event TradeDecoded(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountOutMinimum,
        uint160 sqrtX96,
        uint24 poolFee,
        bool v3
    );
    event TradeExecuted(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountOut,
        uint256 timestamp
    );
    event TradeSuccess(bool success);

    constructor(
        address _addressProvider
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    // Request flashloan
    //
    function requestFlashLoan(
        address _token,
        uint256 _amount,
        bytes memory _params
    ) public {
        address receiverAddress = address(this);
        address asset = _token;
        uint256 amount = _amount;
        bytes memory params = _params;
        uint16 referralCode;
        POOL.flashLoanSimple(
            receiverAddress,
            asset,
            amount,
            params,
            referralCode
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata params
    ) external override returns (bool) {
        uint256 initialBalance = IERC20(asset).balanceOf(address(this));

        uint256 startingBalance = initialBalance - amount;

        Trade[] memory trades = abi.decode(params, (Trade[]));

        uint256 updatedAmount = amount;

        for (uint256 i = 0; i < trades.length; i++) {

            // Pre-approve transaction
            preApprove(
                trades[i].tokenIn,
                updatedAmount,
                trades[i].router
            );

            // get reference of balance of tokenOut
            uint256 beforeSwap = IERC20(trades[i].tokenOut).balanceOf(
                address(this)
            );

            // Do the swap
            if (trades[i].v3) {
                swapV3(
                    trades[i].router,
                    trades[i].tokenIn,
                    trades[i].tokenOut,
                    updatedAmount,
                    trades[i].amountOutMinimum,
                    trades[i].sqrtX96,
                    trades[i].poolFee
                );
            } else {
                swapV2(
                    trades[i].router,
                    trades[i].tokenIn,
                    trades[i].tokenOut,
                    updatedAmount,
                    trades[i].amountOutMinimum
                );
            }

            // get balance of tokenOut after swap
            uint256 afterSwap = IERC20(trades[i].tokenOut).balanceOf(
                address(this)
            );

            // // Update amount with the amount returned from the swap of tokenOut
            updatedAmount = afterSwap - beforeSwap;
        }

        uint256 endingBalance = IERC20(asset).balanceOf(address(this));

        require(endingBalance > startingBalance, "No profit was made");

        // Repay the loan w/ fees
        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwed);

        emit TradeSuccess(true);

        return true;
    }

    function preApprove(
        address _token,
        uint256 amount,
        address routerAddress
    ) internal returns (bool) {
        return IERC20(_token).approve(routerAddress, amount);
    }

    function swapV2(
        address _router,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        uint256 _amountOutMinimum
    ) internal returns (uint256 amountOut) {
        emit TradeExecuted(
            _router,
            _tokenIn,
            _tokenOut,
            _amount,
            block.timestamp
        );

        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint deadline = block.timestamp;
        uint256[] memory amounts = IUniswapV2Router02(_router)
            .swapExactTokensForTokens(
                _amount,
                _amountOutMinimum,
                path,
                address(this),
                deadline
            );

        amountOut = amounts[amounts.length - 1];
        return amountOut;
    }

    // Swap tokenIn for tokenOut returns the amount of tokenOut recieved
    //
    function swapV3(
        address _router,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount,
        uint256 _amountOutMinimum,
        uint160 _sqrtX96,
        uint24 _poolFee
    ) internal returns (uint256 amountOut) {
        emit TradeExecuted(
            _router,
            _tokenIn,
            _tokenOut,
            _amount,
            block.timestamp
        );
        // Use either Uniswap v2 or v3 router
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: _tokenIn,
                tokenOut: _tokenOut,
                fee: _poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: _amount,
                amountOutMinimum: _amountOutMinimum,
                sqrtPriceLimitX96: _sqrtX96
            });
        amountOut = ISwapRouter(_router).exactInputSingle(params);

        return amountOut;
    }

    function simulateFlashLoan(
        address asset,
        uint256 amount,
        bytes memory params
    ) public returns (uint256) {
        uint256 initialBalance = IERC20(asset).balanceOf(address(this));
        require(initialBalance > 0, "Balance is 0");

        uint256 startingBalance = initialBalance - amount;

        Trade[] memory trades = abi.decode(params, (Trade[]));
        
        require(trades.length > 1, "Need more trades");

        uint256 updatedAmount = amount;

        for (uint256 i = 0; i < trades.length; i++) {
            // Log the current trade details
            emit TradeDecoded(
                trades[i].router,
                trades[i].tokenIn,
                trades[i].tokenOut,
                trades[i].amountOutMinimum,
                trades[i].sqrtX96,
                trades[i].poolFee,
                trades[i].v3
            );

            // Pre-approve transaction
            preApprove(
                trades[i].tokenIn,
                updatedAmount,
                trades[i].router
            );

            uint256 beforeSwap = IERC20(trades[i].tokenOut).balanceOf(
                address(this)
            );

            if (trades[i].v3) {
                swapV3(
                    trades[i].router,
                    trades[i].tokenIn,
                    trades[i].tokenOut,
                    updatedAmount,
                    trades[i].amountOutMinimum,
                    trades[i].sqrtX96,
                    trades[i].poolFee
                );
            } else {
                swapV2(
                    trades[i].router,
                    trades[i].tokenIn,
                    trades[i].tokenOut,
                    updatedAmount,
                    trades[i].amountOutMinimum
                );
            }

            uint256 afterSwap = IERC20(trades[i].tokenOut).balanceOf(
                address(this)
            );

            // Update _amount with the amount returned from the swap of the new token
            updatedAmount = afterSwap - beforeSwap;
        }

        uint256 endingBalance = IERC20(asset).balanceOf(address(this));

        require(endingBalance > startingBalance, "No profit was made");

        emit TradeSuccess(true);
        return endingBalance;
    }

    function getBalance(address _tokenAddress) external view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    function withdraw(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {}
}
