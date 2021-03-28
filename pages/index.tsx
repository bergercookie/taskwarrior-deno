import { useDeno } from "aleph/react.ts";
import React, { Component } from "react";

export default class Home extends Component {
  constructor() {
    super();
    this.state = { tasks: [] };
  }

  // componentDidMount() {
  //   fetch("/api/v1/tasks").then((tasks) => {
  //     this.setState({ tasks });
  //   });
  // }

  // render() {
  //   return (
  //     <div>
  //       <div className="page">
  //         <head>
  //           <title>TaskWarrior</title>
  //         </head>
  //         <h1>All tasks</h1>
  //         {this.state.tasks.map((t) => (
  //           <div className="task">{t.props.description}</div>
  //         ))}
  //       </div>
  //     </div>
  //   );
  // }
  render() {
    return (
      <h1>Kalimera</h1>
    )
  }
}
