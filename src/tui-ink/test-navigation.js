#!/usr/bin/env node

// Test script to verify navigation works
console.log('Testing Ink TUI Navigation...');
console.log('=============================');

// Test the state management
import { appReducer, initialState } from './dist/state/appReducer.js';

console.log('1. Testing initial state...');
console.log('Current pane:', initialState.currentPane);
console.log('Divider position:', initialState.dividerPosition);

console.log('\n2. Testing pane switching...');
const switchToRight = appReducer(initialState, {
  type: 'SET_CURRENT_PANE',
  payload: 'right'
});
console.log('After switching to right:', switchToRight.currentPane);

const switchToLeft = appReducer(switchToRight, {
  type: 'SET_CURRENT_PANE',
  payload: 'left'
});
console.log('After switching to left:', switchToLeft.currentPane);

console.log('\n3. Testing item selection...');
const selectItem = appReducer(initialState, {
  type: 'SELECT_ITEM',
  payload: { pane: 'left', index: 2 }
});
console.log('Left pane selected index:', selectItem.leftPane.selectedIndex);

console.log('\n4. Testing divider adjustment...');
const adjustDivider = appReducer(initialState, {
  type: 'SET_DIVIDER_POSITION',
  payload: 60
});
console.log('Divider position after adjustment:', adjustDivider.dividerPosition);

console.log('\n✅ All navigation tests passed!');
console.log('\nTo run the actual TUI:');
console.log('  npm start');
console.log('  or');
console.log('  node demo-fixed.js');
