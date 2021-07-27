const admin = require("firebase-admin");
const functions = require("firebase-functions");

admin.initializeApp();

exports.deleteUser = functions.https.onRequest(
    async (request, response) => {
      const userID = request.body.uid;

      admin.auth().deleteUser(userID).then(()=>{
        console.log("successfully deleted user");
        response.status(200).send("User Deleted");
      }).catch((error) => {
        console.log("unable to delete user");
        response.status(500).send("Failed to delete User : " + error.message);
      });
    });
