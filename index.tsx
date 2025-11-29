import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取 HTML 中的根挂载点
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 初始化 React 根并渲染应用
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);