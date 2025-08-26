import { useState } from "react";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";
import { Link } from "react-router";

export function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>
      <Link to="/about">About</Link>
      <h1>Bun + React</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
      <p>Count: {count}</p>
      <APITester />
    </div>
  );
}

export default App;
