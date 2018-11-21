let CurrentObserver = null;
const PendingCells = new Set();
let Timer = 0;
let RunId = 0;

class Cell {
  reactions = new Set();
  value;
  flag = 0;
  constructor(value) {
    this.value = value;
  }
  get() {
    if (CurrentObserver) {
      CurrentObserver.deps[CurrentObserver.depsCount++] = this;
    }
    return this.value;
  }
  set(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      for (const reaction of this.reactions) {
        reaction.state = "dirty";
        reaction.markAsCheck();
      }
    }
  }
}

class Autorun {
  deps = [];
  depsCount = 0;
  temp = [];
  fn;
  fnCtx;
  state;

  constructor(fn, fnCtx) {
    this.fn = fn;
    this.fnCtx = fnCtx;
    this.state = "init";
  }

  markAsCheck() {
    PendingCells.add(this);
    if (Timer === 0) Timer = setTimeout(runPendingCells);
  }

  actualize() {
    if (this.state === "check") {
      for (let i = 0; i < this.depsCount; i++) {
        const dep = this.deps[i];
        if (dep instanceof Autorun) {
          dep.actualize();
          if (this.state === "dirty") break;
        }
      }
    }
    if (this.state === "dirty" || this.state === "init") this.run.apply(this, arguments);
    this.state = "actual";
  }

  run() {
    const oldDeps = this.deps;
    const oldDepsCount = this.depsCount;
    this.deps = this.temp;
    this.depsCount = 0;
    this.temp = oldDeps;

    const currentObserver = CurrentObserver;
    CurrentObserver = this;
    this.update.apply(this, arguments);
    CurrentObserver = currentObserver;

    RunId+=2;
    for(let i = 0; i < this.depsCount; i++) {
      this.deps[i].flag = RunId;
    }
    for(let i = 0; i < oldDepsCount; i++){
      const dep = oldDeps[i];
      if(dep.flag === RunId){
        dep.flag = RunId+1;
      } else if(dep.flag < RunId) {
        dep.reactions.delete(this);
        if (dep instanceof Autorun && dep.reactions.size === 0) dep.unsubscribe();
      }
    }
    for(let i = 0; i < this.depsCount; i++){
      const dep = this.deps[i];
      if(dep.flag === RunId) {
        dep.reactions.add(this);
      }
    }
  }
  update() {
    this.fn.apply(this.fnCtx, arguments);
  }

  unsubscribe() {
    for (let i = 0; i < this.depsCount; i++) {
      const dep = this.deps[i];
      dep.reactions.delete(this);
      if (dep instanceof Autorun && dep.reactions.size === 0) dep.unsubscribe();
    }
    this.depsCount = 0;
    this.state = "init";
  }
}


class Computed extends Autorun {
  reactions = new Set();
  value;
  constructor(value, fn, fnCtx) {
    super(fn, fnCtx);
    this.value = value;
  }

  get() {
    if (this.state !== "actual") this.actualize();
    if (CurrentObserver) {
      CurrentObserver.deps[CurrentObserver.depsCount++] = this;
    }
    return this.value;
  }

  set(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      for (const reaction of this.reactions) {
        reaction.state = "dirty";
        reaction.markAsCheck();
      }
    }
  }

  markAsCheck() {
    for (const reaction of this.reactions) {
      if (reaction.state === "actual") {
        reaction.state = "check";
        reaction.markAsCheck();
      }
    }
  }
  update() {
    if(this.fn) this.set(this.fn.call(this.fnCtx))
  }
}

function runPendingCells() {
  for (const cell of PendingCells) {
    if (cell.state !== "init") cell.actualize();
  }
  PendingCells.clear();
  if (Timer !== 0) {
    clearTimeout(Timer);
    Timer = 0;
  }
}
module.exports = {Cell, Autorun, Computed, runPendingCells};