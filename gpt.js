// import OpenAI from "openai";
// import mongoose from "mongoose";
// import Node from "./models/Node";
// import Transaction from "./models/Transaction";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   dangerouslyAllowBrowser: true,
// });

// const GET_DATA = async (selectedNode) => {
//   mongoose
//     .connect("mongodb://localhost/Crypto-Sentinel")
//     .then(async (db) => {
//       const node = await Node.find({ id: selectedNode });
//       const transactions = await Transaction.find({
//         $or: [{ source: selectedNode }, { target: selectedNode }],
//       }).populate("source target");

//       if (node)
//         return {
//           node,
//           transactions,
//         };

//       return {};
//     })
//     .catch((e) => {
//       console.log(e);
//       return e.message;
//     });
// };

// const CUSTOM_QUERY = async (query) => {
//   mongoose
//     .connect("mongodb://localhost/Crypto-Sentinel")
//     .then(async (db) => {
//       const transactions = await Transaction.find(query).populate(
//         "source target"
//       );

//       if (transactions) return transactions;
//       return null;
//     })
//     .catch((e) => {
//       console.log(e);
//       return e.message;
//     });
// };

// const tools = [
//   {
//     type: "function",
//     function: {
//       name: "GET_DATA",
//       description: "Gets node information and list of transactions",
//       parameters: {
//         type: "object",
//         properties: {
//           selectNode: {
//             type: "string",
//           },
//         },
//         required: ["selectedNode"],
//       },
//     },
//   },
//   {
//     type: "function",
//     function: {
//       name: "CUSTOM_QUERY",
//       description:
//         "Allows you to run custom mongoose query on Transactions.find using an object, you're open to using it as you wish. Any errors will be returned as a string",
//       parameters: {
//         type: "object",
//         properties: {
//           query: {
//             type: "object",
//             description:
//               "Object parameters for schema.find, look through mongoose's query documentation and create custom objects to get any data for your situation",
//           },
//         },
//         required: ["query"],
//       },
//     },
//   },
//   { type: "code_interpreter" },
//   { type: "retrieval" },
// ];
