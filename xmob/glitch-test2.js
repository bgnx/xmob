const { Cell, Computed, Autorun, runPendingCells } = require("./index3.js");
const assert = require("assert");

const Logs = [];

const firstName = new Cell("fffff");
const lastName = new Cell("lll");

const fullName = new Computed("", () => {
  Logs.push(["fullname"]);
  const newValue = firstName.get() + " " + lastName.get();
  return newValue;
});

const label = new Autorun(() => {
  Logs.push(["label"]);
  fullName.get();
  lastName.set("qqq");
})



label.actualize();
setTimeout(()=>{
  console.log(Logs);
  firstName.set("w");
  lastName.set("qqqq");
  setTimeout(()=>{
    console.log(Logs);
  }, 1000);
}, 1000);