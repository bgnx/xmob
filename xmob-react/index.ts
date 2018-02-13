import {Cell} from "../xmob"
import { Component, ReactNode, SFC, Props } from "react";

type Constructor<T> = new (...args: any[]) => T;
export function connectClass<T extends Constructor<Component<{},{}>>>(target: T): Constructor<{_cell: Cell<ReactNode>}> & T {
    return class extends target {
      _cell: Cell<ReactNode>;
      constructor(...args: Array<any>) {
        super(...args);
        this._cell = new Cell<ReactNode>(null, () => {
          return super.render();
        }, (init) => {
          if(!init) this.forceUpdate();
        }, true);
      }
      render() {
        return this._cell.get();
      }
      componentWillUnmount() {
        this._cell.unsubscribe();
      }
    }
}

export function connectSFC(target: SFC): Constructor<{_cell: Cell<ReactNode>} & Component<{},{}>> {
  return class extends Component {
    _cell: Cell<ReactNode>;
    constructor(props: Props<{}>) {
      super(props);
      this._cell = new Cell<ReactNode>(null, () => {
        return target(this.props);
      }, (init) => {
        if(!init) this.forceUpdate();
      }, true);
    }
    render() {
      return this._cell.get();
    }
    componentWillUnmount() {
      this._cell.unsubscribe();
    }
  } 
}