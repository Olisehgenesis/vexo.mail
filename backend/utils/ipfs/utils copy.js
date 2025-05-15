const { PinataSDK } = require("pinata")
const fs = require("fs")
const { Blob } = require("buffer")
require("dotenv").config()

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL
})

async function upload(){
  try {
    const blob = new Blob([fs.readFileSync("./hello-world.txt")]);
    const file = new File([blob], "hello-world.txt", { type: "text/plain"})
    const upload = await pinata.upload.public.file(file);
    console.log(upload)
  } catch (error) {
    console.log(error)
  }
}


const { PinataSDK } = require("pinata")
require("dotenv").config()

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL
})

async function main() {
  try {
    const file = await pinata.gateways.get("bafkreiac3t35fklpiwqonav2vj4x2dh6x2zugkdu7dsh6zkaq5jr33lcwy")
    console.log(file.data)
  } catch (error) {
    console.log(error);
  }
}

main()