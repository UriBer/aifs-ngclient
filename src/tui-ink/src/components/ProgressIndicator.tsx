import React from 'react';
import { Box, Text } from 'ink';

interface ProgressIndicatorProps {
  isVisible: boolean;
  message: string;
  percentage?: number;
  operation?: string;
}

export function ProgressIndicator({ 
  isVisible, 
  message, 
  percentage, 
  operation 
}: ProgressIndicatorProps) {
  if (!isVisible) return null;

  const renderProgressBar = () => {
    if (percentage === undefined) {
      // Indeterminate progress with animated spinner
      const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      const currentChar = spinnerChars[Math.floor(Date.now() / 100) % spinnerChars.length];
      
      return (
        <Box flexDirection="row" justifyContent="center" alignItems="center">
          <Text color="yellow">{currentChar}</Text>
          <Text color="white"> {message}</Text>
        </Box>
      );
    }

    // Determinate progress
    const barWidth = 30;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    return (
      <Box flexDirection="column" alignItems="center">
        <Text color="yellow" bold>
          {message}
        </Text>
        {operation && (
          <Text color="gray">
            {operation}
          </Text>
        )}
        <Box flexDirection="row" marginTop={1}>
          <Text color="green">{'█'.repeat(filledWidth)}</Text>
          <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
          <Text color="white"> {percentage.toFixed(0)}%</Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      width="60%"
      height="25%"
      borderStyle="single"
      borderColor="yellow"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {renderProgressBar()}
    </Box>
  );
}
