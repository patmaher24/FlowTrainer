import './style.css'
import { App } from './App'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Could not find the #app element')
}

root.replaceChildren(App())