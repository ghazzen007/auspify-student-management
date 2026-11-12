const mongoose = require("mongoose");

/**
 * Atomic sequence numbers, used to generate readable student IDs
 * such as STU-2026-0007 without race conditions.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

counterSchema.statics.next = async function next(name) {
  // Two requests creating the same counter at the same moment can collide on _id;
  // the loser simply tries again and finds the counter the winner created.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const counter = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after", upsert: true });
      return counter.seq;
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
  return null;
};

module.exports = mongoose.model("Counter", counterSchema);
