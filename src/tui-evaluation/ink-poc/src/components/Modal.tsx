import React from 'react';
import { Box, Text } from 'ink';

interface ModalProps {
  type?: 'confirm' | 'input' | 'progress';
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function Modal({ type = 'confirm', title, message, onConfirm, onCancel }: ModalProps) {
  return (
    <Box
      width="80%"
      height="60%"
      borderStyle="double"
      borderColor="blue"
      flexDirection="column"
    >
      {/* Title */}
      {title && (
        <Box
          borderStyle="single"
          borderColor="blue"
          padding={1}
        >
          <Text color="white" bold>
            {title}
          </Text>
        </Box>
      )}

      {/* Content */}
      <Box
        flexGrow={1}
        padding={2}
        flexDirection="column"
        justifyContent="center"
      >
        {message && (
          <Text color="white">
            {message.split('\n').map((line, index) => (
              <Text key={index}>
                {line}
                {index < message.split('\n').length - 1 && '\n'}
              </Text>
            ))}
          </Text>
        )}
      </Box>

      {/* Actions */}
      <Box
        borderStyle="single"
        borderColor="blue"
        padding={1}
        flexDirection="row"
        justifyContent="center"
      >
        {type === 'confirm' && (
          <>
            <Text color="green">Y: Confirm</Text>
            <Text color="gray"> | </Text>
            <Text color="red">N: Cancel</Text>
            <Text color="gray"> | </Text>
            <Text color="gray">ESC: Cancel</Text>
          </>
        )}
        {type === 'input' && (
          <>
            <Text color="green">Enter: Submit</Text>
            <Text color="gray"> | </Text>
            <Text color="red">ESC: Cancel</Text>
          </>
        )}
        {type === 'progress' && (
          <Text color="yellow">Processing...</Text>
        )}
      </Box>
    </Box>
  );
}
