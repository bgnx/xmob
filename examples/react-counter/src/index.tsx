import * as React from "react";
import * as ReactDOM from "react-dom";
import { Cell } from "xmob";
import { connectSFC } from "xmob-react";

const AppState = new class {
  $count = new Cell(0);
  get count() { return this.$count.get() }
  set count(val) { this.$count.set(val) }
}

const App = connectSFC(() => (
  <div>
    <div>Clicked: {AppState.count}</div>
    <button onClick={() => AppState.count++}>click</button>
  </div>
))

ReactDOM.render(<App />, document.getElementById("root"));