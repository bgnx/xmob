let CurrentObserver = null;
const PendingCells = new Set();
let Timer = 0;

class Cell {
  reactions = new Set();
  value;
  constructor(value) {
    this.value = value;
  }
  get() {
    if (CurrentObserver) {
      this.reactions.add(CurrentObserver);
      CurrentObserver.dependencies.add(this);
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
  dependencies = new Set();
  tempSet = new Set();
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
      for (const dep of this.dependencies) {
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
    const oldDependencies = this.dependencies;
    this.dependencies = this.tempSet;
    this.tempSet = oldDependencies;
    const currentObserver = CurrentObserver;
    CurrentObserver = this;
    this.update.apply(this, arguments);
    CurrentObserver = currentObserver;
    for (const dep of this.tempSet) {
      if (!this.dependencies.has(dep)) {
        dep.reactions.delete(this);
        if (dep instanceof Autorun && dep.reactions.size === 0) dep.unsubscribe();
      }
    }
    this.tempSet.clear();
  }
  update() {
    this.fn.apply(this.fnCtx, arguments);
  }

  unsubscribe() {
    for (const dep of this.dependencies) {
      dep.reactions.delete(this);
      if (dep instanceof Autorun && dep.reactions.size === 0) dep.unsubscribe();
    }
    this.dependencies.clear();
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
      this.reactions.add(CurrentObserver);
      CurrentObserver.dependencies.add(this);
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
export default {Cell, Autorun, Computed};