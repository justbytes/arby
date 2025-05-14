const fs = require("fs");

/**
 * Writes successful trade data to an archive file for tax and research purposes
 */
const archive = (data) => {
  // Get the current date and add it to the front of the file
  //
  const currentDate = new Date();
  const dateString = currentDate.toISOString();

  // create an object of the date and data that will be appended to archive file
  //
  const entry = `${dateString}: ${JSON.stringify(data)}` + "\n";

  // Save the transaction to the archive file
  //
  fs.appendFile(this.filename, entry, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("Transaction was saved to archive ", this.filename);
    }
  });
};

module.exports = archive;
