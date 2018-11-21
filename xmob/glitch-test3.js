const { Cell, Computed, Autorun, runPendingCells } = require("./index3.js");

const a = new Cell(0);
const b = new Cell(0);
const c = new Computed(0, () => a.get() + b.get());
//const d = new Computed(0, () => c.get() + 1);
const values = [];
const ar = new Autorun(() => {
	values.push(c.get());
	b.set(100);
});
ar.actualize();
a.set(1);
setTimeout(()=>{
  console.log(values);
}, 1000)

//t.deepEqual(values, [0, 100, 101]);