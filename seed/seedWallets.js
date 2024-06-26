import mongoose from "mongoose";
import Node from "../models/Node.js";
import Transaction from "../models/Transaction.js";
import fs from "fs";
import csv from "csv-parser";
import readline from "readline";
import path from "path";

const enumWithWeightages = [
  { value: "Official", weightage: 0.001 },
  { value: "Normal", weightage: 0.997 },
  { value: "Criminal", weightage: 0.002 },
];

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function randomizeEnum(enumArray) {
  const randomValue = Math.random();

  let cumulativeWeightage = 0;
  let selectedEnum = null;

  for (const { value, weightage } of enumArray) {
    cumulativeWeightage += weightage;
    if (randomValue <= cumulativeWeightage) {
      selectedEnum = value;
      break;
    }
  }

  return selectedEnum;
}

// const seedNodes = async () => {
//   var counter = 0;
// for (let i = 0; i <= 1000; i++) {
//     try {
//       const getEnum = randomizeEnum(enumWithWeightages);
//       const getRating = () => {
//         if (getEnum == "Official") return 10.0;
//         else if (getEnum == "Normal")
//           return (Math.random() * (9.5 - 4.5) + 4.5).toFixed(1);
//         else return 0.0;
//       };
//       const node = await Node.create({
//         flag: getEnum,
//         amount: Math.floor(Math.random() * 100000) + 1,
//         x: 0,
//         y: 0,
//         rating: getRating(),
//         information: {},
//       });
//       console.log(counter, ": ", node);
//       counter++;
//     } catch (e) {
//       console.log(e.message);
//     }
//   }
// };

// const seedTransactions = async () => {
//   var counter = 0;
//   for (let i = 0; i <= 3000; i++) {
//     try {
//       const nodes = await Node.find({}).select("_id amount");
//       // console.log(nodes);
//       const source = nodes[Math.floor(Math.random() * nodes.length)];
//       const target = nodes[Math.floor(Math.random() * nodes.length)];

//       if (source !== target) {
//         const transaction = await Transaction.create({
//           source: source._id,
//           target: target._id,
//           amount: Math.floor(Math.random() * source.amount) + 1,
//         });

//         console.log(counter, ": ", transaction);
//       }
//       counter++;
//     } catch (e) {
//       console.log(e.message);
//     }
//   }
// };

const results = [];

const readCsv = () => {
  const csvFilePath = "./data.csv";

  const filePath = path.resolve(__dirname, csvFilePath);

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      results.push(data);
    })
    .on("end", async () => {
      console.log("DATA READ COMPLETE");
      seedNodesAndLinks();
      console.log("FINISHED ADDING TO DB");
    });
};

// const readCsv = () => {
//   const csvFilePath = "./data.csv";
//   const filePath = path.resolve(__dirname, csvFilePath);
//   const results = [];

//   const rl = readline.createInterface({
//     input: fs.createReadStream(filePath),
//     output: process.stdout,
//     terminal: false,
//   });

//   let rowCount = 0;
//   rl.on("line", (line) => {
//     rowCount++;
//     results.push(line);
//     if (rowCount >= 10000) {
//       rl.close(); // Close the stream after reading 10,000 lines
//     }
//   });

//   rl.on("close", async () => {
//     console.log("DATA READ COMPLETE");
//     // Assuming you have a function to process the data
//     seedNodesAndLinks();
//     console.log("FINISHED ADDING TO DB");
//   });
// };

const seedNodesAndLinks = async () => {
  var counter = 0;
  for (let i = 0; i <= results.length; i++) {
    try {
      const getEnum = randomizeEnum(enumWithWeightages);

      const getRating = () => {
        if (getEnum == "Official") return 10.0;
        else if (getEnum == "Normal")
          return (Math.random() * (9.5 - 4.5) + 4.5).toFixed(1);
        else return 0.0;
      };

      const getValue = () => {
        const inputString = results[i].Value;

        const match = inputString.split(" ");

        if (match) {
          const extractedNumber = parseFloat(match[0]);
          return extractedNumber;
        } else {
          console.log("No decimal number found in the input string.");
          return 0;
        }
      };

      const value = getValue();

      if (value === 0) {
        continue;
      }

      // ===========================================
      const source = results[i].From;
      const sourceNode = await Node.findOne({ name: source }).select("_id");

      console.log(sourceNode);
      if (sourceNode) {
        const target = results[i].To;
        const targetNode = await Node.findOne({ name: target }).select("_id");
        if (targetNode) {
          const transaction = await Transaction.create({
            source: sourceNode._id,
            target: targetNode._id,
            amount: value,
          });
          counter++;
          console.log(counter);
        } else {
          const newTargetNode = await Node.create({
            name: target,
            flag: getEnum,
            amount: Math.floor(Math.random() * 100000) + 1,
            rating: getRating(),
            information: {},
          });
          const transaction = await Transaction.create({
            source: sourceNode._id,
            target: newTargetNode._id,
            amount: value,
          });
          counter++;
          console.log(counter);
        }
      } else {
        const newSourceNode = await Node.create({
          name: source,
          flag: getEnum,
          amount: Math.floor(Math.random() * 100000) + 1,
          rating: getRating(),
          information: {},
        });
        const target = results[i].To;
        const targetNode = await Node.findOne({
          name: target,
        }).select("_id");
        if (targetNode) {
          const transaction = await Transaction.create({
            source: newSourceNode._id,
            target: targetNode._id,
            amount: value,
          });
          counter++;
          console.log(counter);
        } else {
          const newTargetNode = await Node.create({
            name: target,
            flag: getEnum,
            amount: Math.floor(Math.random() * 100000) + 1,
            rating: getRating(),
            information: {},
          });
          const transaction = await Transaction.create({
            source: newSourceNode._id,
            target: newTargetNode._id,
            amount: value,
          });
          counter++;
          console.log(counter);
        }
      }
    } catch (err) {
      console.log("ERROR");
    }
  }
};

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel")
  .then(() => {
    // seedNodes();
    // seedTransactions();
    readCsv();
  })
  .catch((error) => console.log(error.message));
