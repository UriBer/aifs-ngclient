#!/usr/bin/env node

// Simple test without complex input handling
import { render } from 'ink';
import React from 'react';
import { Box, Text } from 'ink';

function SimpleApp() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green">Simple Test</Text>
      <Text color="white">This should work without raw mode issues</Text>
      <Text color="gray">Press Ctrl+C to exit</Text>
    </Box>
  );
}

console.log('Starting simple test...');
render(<SimpleApp />);
