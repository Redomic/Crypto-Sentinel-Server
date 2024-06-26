import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

import catchAsync from "./catchAsync.js";

import Node from "./models/Node.js";
import Transaction from "./models/Transaction.js";

// import { Worker } from "worker_threads";
// import Thread from "./models/Thread.js";
// import OpenAI from "openai";
import Crawler from "./models/Crawler.js";

// const simulationWorker = new Worker("./workers/simulation-worker.js");
// const crawlerWorker = new Worker("./workers/crawler-worker.js");
const app = express();

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   dangerouslyAllowBrowser: true,
// });

var isSimulating = true;

// simulationWorker.on("message", async (message) => {
//   try {
//     if (message.type == "update") {
//       console.log("Simulation started...");
//     } else if (message.type == "stop") {
//       isSimulating = false;
//       console.log("== Simulation Stopped ==");
//     }
//   } catch (e) {
//     console.log(e);
//   }
// });

// crawlerWorker.on("message", async (message) => {
//   try {
//     if (message.type == "update") {
//       console.log("Crawler Started");
//     } else if (message.type == "stop") {
//       isSimulating = false;
//       console.log("== Crawler Stopped ==");
//     }
//   } catch (e) {
//     console.log(e);
//   }
// });

process.on("SIGINT", () => {
  // simulationWorker.postMessage({ command: "stop" });
  // crawlerWorker.postMessage({ command: "stop" });
  process.exit();
});

// ------------------------------------------------------------- MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser(process.env.COOKIESECRET));

const corsOrigin =
  process.env.SERVERMODE === "development"
    ? true
    : ["https://sentinel.redomic.in", "https://www.sentinel.redomic.in"];

app.use(cors({ credentials: true, origin: corsOrigin }));

// ------------------------------------------------------------- ROUTES

app.get(
  "/api/nodes",
  catchAsync(async (req, res) => {
    const limiter = 15000;
    const nodes = await Node.find({}).limit(limiter);
    const limitedLinks = await Transaction.find({}).limit(limiter);

    const links = await Transaction.aggregate([
      {
        $match: {
          _id: {
            $in: limitedLinks.map((transaction) => transaction._id),
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $gte: ["$source", "$target"] },
              then: { source: "$source", target: "$target" },
              else: { source: "$target", target: "$source" },
            },
          },
          count: { $sum: 1 },
          doc: { $first: "$$ROOT" }, // Keep the first document of each group
        },
      },
      // {
      //   $match: {
      //     count: { $gt: 1 }, // Filter out pairs that appear only once
      //   },
      // },
      {
        $replaceRoot: { newRoot: "$doc" }, // Replace the root with the original documents
      },
    ]);

    console.log(links.length);

    res.json({
      status: "success",
      nodes: nodes,
      links: links,
    });
  })
);

app.get(
  "/api/node/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const transactions = await Transaction.find({
      $or: [{ source: id }, { target: id }],
    }).populate("source target");

    res.json({
      status: "success",
      transactions: transactions,
    });
  })
);

//

app.get(
  "/api/node/:id/graph",
  catchAsync(async (req, res) => {
    const id = new mongoose.Types.ObjectId(req.params.id);

    console.log(id);

    const getNodes = async (nodeId) => {
      const queue = [{ nodeId, depth: 0 }];

      while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();

        const transactions = await Transaction.find({
          $or: [{ source: nodeId }, { target: nodeId }],
        }).populate("source target");

        transactions.forEach((transaction) => {
          const sourceId = transaction.source._id.toString();
          const targetId = transaction.target._id.toString();

          if (!nodes.some((node) => node._id.toString() === sourceId)) {
            nodes.push(transaction.source);
          }

          if (!nodes.some((node) => node._id.toString() === targetId)) {
            nodes.push(transaction.target);
          }

          links.push({ source: sourceId, target: targetId });

          if (!visitedNodes.has(sourceId)) {
            visitedNodes.add(sourceId);
            queue.push({ nodeId: sourceId, depth: depth + 1 });
          }
          if (!visitedNodes.has(targetId)) {
            visitedNodes.add(targetId);
            queue.push({ nodeId: targetId, depth: depth + 1 });
          }
        });
      }
    };

    let nodes = [];
    let links = [];
    const visitedNodes = new Set();

    const initialNode = await Transaction.findById(id);
    if (initialNode) {
      nodes.push(initialNode);
    }

    await getNodes(id);

    res.json({
      status: "success",
      nodes: nodes,
      links: links,
    });
  })
);

// app.post(
//   "/api/chat",
//   catchAsync(async (req, res) => {
//     const assistantIdToUse = "asst_FEH0IMG5qtmrgwaFhEry6gqO"; // Replace with your assistant ID

//     var currentThread = null;

//     const exisitingThread = await Thread.find({ node: req.body.node });

//     console.log("Exisiting Thread: ", exisitingThread);

//     if (!exisitingThread.length) {
//       console.log("Thread does not exist");
//       const thread = await openai.beta.threads.create();
//       await Thread.create({
//         thread: thread.id,
//         node: req.body.node,
//         messages: [],
//       });
//       console.log("New thread created with ID: ", thread.id, "\n");
//       currentThread = thread.id;
//     } else {
//       currentThread = exisitingThread[0].thread;
//     }

//     const userMessage = req.body.message;

//     try {
//       const myThreadMessage = await openai.beta.threads.messages.create(
//         currentThread, // Use the stored thread ID for this user
//         {
//           role: "user",
//           content: userMessage,
//         }
//       );
//       console.log("This is the message object: ", myThreadMessage, "\n");

//       // Run the Assistant
//       const myRun = await openai.beta.threads.runs.create(
//         currentThread, // Use the stored thread ID for this user
//         {
//           assistant_id: assistantIdToUse,
//           instructions:
//             "You're Node Bot, an assistant Data Analyst for Crypto Sentinel, a monitor/tracking layer on blockchain networks. Your job is to assist government agencies and agents in finding patterns, draft reports, and give insight into fighting illicit activities in the blockchain network you're monitoring. You're to be professional. Currently, you're running in beta so there's limited data provided to you, so you can make up things if you don't have available information Start the thread by greeting the agent and giving 4 things you can do. The agent has a GUI that contains a force-directed graph of 15000 nodes and transactions. Give your all your responses in markdown", // Your instructions here
//         }
//       );
//       console.log("This is the run object: ", myRun, "\n");

//       const retrieveRun = async () => {
//         let keepRetrievingRun;

//         while (myRun.status !== "completed") {
//           keepRetrievingRun = await openai.beta.threads.runs.retrieve(
//             currentThread, // Use the stored thread ID for this user
//             myRun.id
//           );

//           console.log(`Run status: ${keepRetrievingRun.status}`);

//           if (keepRetrievingRun.status === "completed") {
//             console.log("\n");
//             break;
//           }
//         }
//       };
//       retrieveRun();

//       // Retrieve the Messages added by the Assistant to the Thread
//       const waitForAssistantMessage = async () => {
//         await retrieveRun();

//         const allMessages = await openai.beta.threads.messages.list(
//           currentThread // Use the stored thread ID for this user
//         );

//         await Thread.updateOne(
//           { thread: currentThread },
//           {
//             messages: allMessages.data.map((message) => {
//               return {
//                 role: message.role,
//                 content: message.content[0].text.value,
//               };
//             }),
//           }
//         );

//         // Send the response back to the front end
//         res.status(200).json({
//           status: "success",
//           response: allMessages.data[0].content[0].text.value,
//         });
//         console.log(
//           "------------------------------------------------------------ \n"
//         );

//         console.log("User: ", myThreadMessage.content[0].text.value);
//         console.log("Assistant: ", allMessages.data[0].content[0].text.value);
//       };
//       waitForAssistantMessage();
//     } catch (error) {
//       console.error("Error:", error);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   })
// );

// app.post(
//   "/chat",
//   catchAsync(async (req, res) => {
//     const assistantId = "asst_FEH0IMG5qtmrgwaFhEry6gqO";

//     console.log(req.body);

//     var currentThread = null;

//     const exisitingThread = await Thread.find({ node: req.body.node });

//     console.log("Exisiting Thread: ", exisitingThread);

//     if (!exisitingThread.length) {
//       console.log("Thread does not exist");
//       const thread = await openai.beta.threads.create();
//       await Thread.create({
//         thread: thread.id,
//         node: req.body.node,
//         messages: [],
//       });
//       console.log("New thread created with ID: ", thread.id, "\n");
//       currentThread = thread.id;
//     } else {
//       currentThread = exisitingThread[0].thread;
//     }

//     const GET_DATA = async (selectedNode) => {
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
//     };

//     const metadata = {
//       selectedNode: req.body.node,
//     };

//     const message = `\`\`\`\n${GET_DATA(req.)}\n\`\`\`\n\n${
//       req.body.message
//     }`;

//     console.log("message");

//     await openai.beta.threads.messages.create(currentThread, {
//       role: "user",
//       content: message,
//     });

//     const tools = [
//       // {
//       //   type: "function",
//       //   function: {
//       //     name: "GET_DATA",
//       //     description: "Gets node information and list of transactions",
//       //     parameters: {
//       //       type: "object",
//       //       properties: {
//       //         selectNode: {
//       //           type: "string",
//       //         },
//       //       },
//       //       required: ["selectedNode"],
//       //     },
//       //   },
//       // },
//       { type: "code_interpreter" },
//     ];

//     // Run the Assistant
//     const run = await openai.beta.threads.runs.create(currentThread, {
//       assistant_id: assistantId,
//       instructions: `You're Node Bot, an assistant Data Analyst for Crypto Sentinel, a monitor/tracking layer on blockchain networks. Your job is to assist government agencies and agents in finding patterns, draft reports, and give insight into fighting illicit activities in the blockchain network you're monitoring.

// You're to be professional and concise with the information you provide.

// Currently, you're running in beta so there's limited data provided to you, so you can make up things if you don't have available information, but stay within limits.

// Start the thread by greeting the agent and giving 4 things you can do.

// The agent has a GUI that contains a force directed graph of 15000 nodes and transactions

// The backend is running on Node.js, Express, and MongoDB (Mongoose ORM)

// Every message from the user will contain METADATA encased in a pair of \`\`\`, you're to never acknowledge this metadata to the end user

// The metadata will contain:
// - Selected Node ID
// - Node Information
// - Rating
// - Tag
// - other Information

// how the METADATA will look:
// \`\`\`
// data
// \`\`\`

// This is the MongoDB Schema:
// const nodeSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//     },
//     rating: {
//       type: Number,
//       required: true,
//     },
//     flag: {
//       type: String,
//       enum: ["Official", "Normal", "Criminal"],
//       default: "Normal",
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     information: {
//       type: {
//         name: {
//           type: String,
//         },
//         address: {
//           type: String,
//         },
//         phone: {
//           type: String,
//         },
//         aadhar: {
//           type: String,
//         },
//       },
//       required: false,
//     },
//     x: {
//       type: Number,
//       required: false,
//     },
//     y: {
//       type: Number,
//       required: false,
//     },
//     vx: {
//       type: Number,
//       required: false,
//     },
//     vy: {
//       type: Number,
//       required: false,
//     },
//     index: {
//       type: Number,
//       required: true,
//     },
//   },
//   { strict: true, timestamps: true }
// );

// const transactionSchema = new mongoose.Schema(
//   {
//     source: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Node",
//       required: true,
//     },
//     target: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Node",
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     index: {
//       type: Number,
//       required: false,
//     },
//   },
//   { strict: true, timestamps: true }
// );

// For the initial message provide general information about the node and then look through the list of transactions and start creating statistics based on to and fro transactions from suspicious or criminal or low rated (less than 4) nodes.`, // Your instructions here
//       tools: tools,
//     });

//     const retrieveRun = async () => {
//       const keepRetrievingRun = await openai.beta.threads.runs.retrieve(
//         currentThread,
//         run.id
//       );

//       console.log(`Run status: ${keepRetrievingRun.status}`);

//       if (keepRetrievingRun.status !== "completed") {
//         setTimeout(retrieveRun, 500);
//       } else if (keepRetrievingRun.status !== "failed") {
//         throw Error("Message Failed");
//       } else {
//         console.log("\n")
//       }
//     };

//     // const waitForAssistantMessage = async () => {
//     //   await retrieveRun();

//     //   const allMessages = await openai.beta.threads.messages.list(
//     //     currentThread
//     //   );

//     //   await Thread.updateOne(
//     //     { thread: currentThread },
//     //     {
//     //       messages: allMessages.data.map((message) => {
//     //         return { role: message.role, content: message.content[0].text };
//     //       }),
//     //     }
//     //   );

//     //   res.status(200).json({
//     //     status: "success",
//     //     response: allMessages.data[0].content[0].text.value,
//     //   });

//     //   console.log("Assistant: ", allMessages.data[0].content[0].text.value);
//     // };

//     await retrieveRun();

//     const allMessages = await openai.beta.threads.messages.list(currentThread);

//     console.log(allMessages);

//     await Thread.updateOne(
//       { thread: currentThread },
//       {
//         messages: allMessages.data.map((message) => {
//           return { role: message.role, content: message.content[0].text };
//         }),
//       }
//     );

//     console.log("Assistant: ", allMessages.data[0].content[0].text.value);

//     res.status(200).json({
//       status: "success",
//       response: allMessages.data[0].content[0].text.value,
//     });
//   })
// );

// app.get(
//   "/api/chat/:selectedNode",
//   catchAsync(async (req, res) => {
//     const { selectedNode } = req.params;
//     const thread = await Thread.find({
//       node: selectedNode,
//     });

//     console.log(thread[0].messages);

//     if (!thread.length) {
//       res.json({
//         status: "success",
//         messages: [],
//       });
//     } else {
//       res.json({
//         status: "success",
//         messages: thread[0].messages,
//       });
//     }
//   })
// );

app.get(
  "/api/crawler",
  catchAsync(async (req, res) => {
    const wallets = await Crawler.find({});

    if (!wallets.length) {
      res.json({
        status: "success",
        wallets: [],
      });
    } else {
      res.json({
        status: "success",
        wallets: wallets,
      });
    }
  })
);

// ------------------------------------------------------------- ERROR HANDLING

app.use((err, req, res, next) => {
  if (!err.message) err.message = "Something went wrong";
  // console.log(err.message);
  console.log(err);
  res.status(200).json({
    status: "failed",
    message: err.message,
  });
});

// ------------------------------------------------------------- LISTENER

var servermode =
  process.env.SERVERMODE === "development"
    ? {}
    : {
        authSource: "admin",
        user: "admin",
        pass: process.env.MONGOPASS,
      };

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel", servermode)
  .then(() => {
    app.listen(5300, () => {
      console.log("Server running on PORT: 5300");
    });

    simulationWorker.postMessage({ command: "init" });
    crawlerWorker.postMessage({ command: "init" });
  })
  .catch((error) => console.log(error.message));
