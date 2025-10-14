#!/usr/bin/env node

// Simple test to check if function keys work
import { render } from 'ink';
import React from 'react';
import { Box, Text, useInput } from 'ink';

function TestApp() {
  useInput((input, key) => {
    console.log('Input received:', { input, key });
    
    if (key.f1) {
      console.log('F1 detected!');
    }
    if (key.f5) {
      console.log('F5 detected!');
    }
    if (key.f10) {
      console.log('F10 detected!');
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green">Function Key Test</Text>
      <Text color="white">Press F1, F5, or F10 to test</Text>
      <Text color="gray">Press Ctrl+C to exit</Text>
    </Box>
  );
}

console.log('Starting function key test...');
render(<TestApp />);
