import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendSimpleMessage() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.API_KEY || "API_KEY",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("sandboxf37a5048fe784e06ab142314ceb4322c.mailgun.org", {
      from: "Mailgun Sandbox <postmaster@sandboxf37a5048fe784e06ab142314ceb4322c.mailgun.org>",
      to: ["Oliseh Genesis <innovationsug06@gmail.com>"],
      subject: "Hello Oliseh Genesis",
      text: "Congratulations Oliseh Genesis, you just sent an email with Mailgun! You are truly awesome!",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}