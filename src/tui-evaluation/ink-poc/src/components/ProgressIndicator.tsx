import React from 'react';
import { Box, Text } from 'ink';

interface ProgressIndicatorProps {
  message: string;
  percentage?: number;
}

export function ProgressIndicator({ message, percentage }: ProgressIndicatorProps) {
  const renderProgressBar = () => {
    if (percentage === undefined) {
      // Indeterminate progress
      return (
        <Box flexDirection="row">
          <Text color="yellow">⠋</Text>
          <Text color="yellow">⠙</Text>
          <Text color="yellow">⠹</Text>
          <Text color="yellow">⠸</Text>
          <Text color="yellow">⠼</Text>
          <Text color="yellow">⠴</Text>
          <Text color="yellow">⠦</Text>
          <Text color="yellow">⠧</Text>
          <Text color="yellow">⠇</Text>
          <Text color="yellow">⠏</Text>
        </Box>
      );
    }

    // Determinate progress
    const barWidth = 20;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    return (
      <Box flexDirection="row">
        <Text color="green">{'█'.repeat(filledWidth)}</Text>
        <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
        <Text color="white"> {percentage.toFixed(0)}%</Text>
      </Box>
    );
  };

  return (
    <Box
      width="60%"
      height="20%"
      borderStyle="single"
      borderColor="yellow"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Text color="yellow" bold>
        {message}
      </Text>
      <Box marginTop={1}>
        {renderProgressBar()}
      </Box>
    </Box>
  );
}
