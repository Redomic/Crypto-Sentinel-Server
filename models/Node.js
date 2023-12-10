import mongoose from "mongoose";

const nodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    flag: {
      type: String,
      enum: ["Official", "Normal", "Criminal"],
      default: "Normal",
    },
    amount: {
      type: Number,
      required: true,
    },
    information: {
      type: {
        name: {
          type: String,
        },
        address: {
          type: String,
        },
        phone: {
          type: String,
        },
        aadhar: {
          type: String,
        },
      },
      required: false,
    },
    x: {
      type: Number,
      required: false,
    },
    y: {
      type: Number,
      required: false,
    },
    vx: {
      type: Number,
      required: false,
    },
    vy: {
      type: Number,
      required: false,
    },
    index: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { strict: true, timestamps: true }
);

nodeSchema.set("toJSON", {
  virtuals: true,
});

nodeSchema.virtual("val").get(function () {
  return 1;
});

export default mongoose.model("Node", nodeSchema);
