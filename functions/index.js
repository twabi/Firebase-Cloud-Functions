const admin = require("firebase-admin");
const functions = require("firebase-functions");
const XlsxTemplate = require("xlsx-template");
const {readFile} = require("fs");
const {join} = require("path");


admin.initializeApp();

exports.deleteUser = functions.https.onRequest(
    async (request, response) => {
      response.set("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Headers",
          "Content-Type, Access-Control-Allow-Headers, " +
          "Authorization, X-Requested-With");
      response.set("Access-Control-Allow-Methods", "GET, POST");

      if (request.method === "OPTIONS") {
        // stop preflight requests here
        response.status(204).send("");
        return;
      }
      const userID = request.body.uid;

      admin.auth().deleteUser(userID).then(()=>{
        console.log("successfully deleted user");
        response.status(200).send("User Deleted");
      }).catch((error) => {
        console.log("unable to delete user");
        response.status(500).send("Failed to delete User : " + error.message);
      });
    });


exports.getUserDetails = functions.https.onRequest(
    async (request, response) => {
      response.set("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Headers",
          "Content-Type, Access-Control-Allow-Headers, " +
          "Authorization, X-Requested-With");
      response.set("Access-Control-Allow-Methods", "GET, POST");

      if (request.method === "OPTIONS") {
        // stop preflight requests here
        response.status(204).send("");
        return;
      }
      const userID = request.body.uid;

      admin.auth().getUser(userID)
          .then((userRecord) => {
            console.log(`Successfully fetched user data: 
            ${userRecord.toJSON()}`);
            response.status(200).send(userRecord.toJSON());
          })
          .catch((error) => {
            console.log("Error fetching user data:", error);
            response.status(500).send("Failed to get User : " + error.message);
          });
    });

exports.getQuotation = functions.https.onRequest(async (request, response) => {
  // CORS Headers (Important for browser requests)
  response.set("Access-Control-Allow-Origin", "*");
  response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
  );
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.status(204).send(""); // Handle preflight requests
    return;
  }

  // console.log(request.body)
  // Error Handling for Missing Data
  if (!request.body.products || !request.body.date ||
      !request.body.customer || !request.body.quotationNumber) {
    response.status(400)
        .send("Missing required data: products, " +
            "date, customer, or quoteNumber");
    return;
  }

  const productList = request.body.products;
  const date = request.body.date;
  const customer = request.body.customer;
  const quoteNumber = request.body.quotationNumber;
  const quoteType = request.body.quoteType;

  let fileName = "";
    quoteType.toLowerCase() === "invoice" ?
        fileName = "INVOICE" : fileName = "QUOTATION";

    try {
      const templateBuffer =
          await new Promise((resolve, reject) => {
            readFile(join(__dirname, "templates", `${fileName}.xlsx`),
                (err, data) => {
                  if (err) reject(err);
                  else resolve(data);
                });
          }); // Use promises for async file reading

      const template =
          new XlsxTemplate(templateBuffer); // Use the Buffer directly

      // Data for Substitution (Ensure Correct Format)
      const values = {
        quoteType: quoteType,
        date: date,
        customer: customer,
        quotationNumber: quoteNumber,
        item:
            productList
                .map((product, index) => ({ // Map products for the template
                  no: index + 1,
                  description: product.description,
                  specs: product.specs,
                  price: product.price,
                  quantity: product.quantity,
                })),
      };

      console.log(values);

      template.substitute(1, values);

      // Generate Excel File
      const data = template
          .generate({type: "nodebuffer"});
      console.log(data);
      response.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      response.setHeader(
          "Content-Disposition",
          "attachment; filename=Quotation.xlsx"
      );
      response.send(data);
    } catch (error) {
      console.error("Error generating quotation:", error);
      response.status(500).send("Error generating quotation");
    }
});
