import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ModalProps {
  isOpen: boolean;
  type?: 'confirm' | 'input' | 'progress' | 'help' | 'provider';
  title?: string;
  message?: string;
  inputValue?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSubmit?: (value: string) => void;
  onInputChange?: (value: string) => void;
}

export function Modal({ 
  isOpen, 
  type = 'confirm', 
  title, 
  message, 
  inputValue = '',
  onConfirm, 
  onCancel, 
  onSubmit,
  onInputChange 
}: ModalProps) {
  // Handle input for input modals
  useInput((input: string, key: any) => {
    if (!isOpen) return;

    if (type === 'input') {
      if (key.return) {
        onSubmit?.(inputValue);
      } else if (key.escape) {
        onCancel?.();
      } else if (key.backspace) {
        onInputChange?.(inputValue.slice(0, -1));
      } else if (input && input.length === 1) {
        onInputChange?.(inputValue + input);
      }
    } else {
      // Handle other modal types
      if (input === 'y' || input === 'Y' || key.return) {
        onConfirm?.();
      } else if (input === 'n' || input === 'N' || key.escape) {
        onCancel?.();
      }
    }
  }, { isActive: isOpen });

  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'help':
        return {
          title: 'Help - Keyboard Shortcuts',
          content: `Navigation:
  Tab: Switch between panes
  Arrow Keys: Navigate files
  Enter: Open directory
  Backspace: Go up directory
  Home/End: Go to first/last item
  Page Up/Down: Scroll

Selection:
  Space: Toggle selection
  Ctrl+A: Select all
  Ctrl+C: Clear selection

Operations:
  F1: Show this help
  F2: Rename
  F3: Search
  F4: Edit
  F5: Copy
  F6: Move
  F7: Create directory
  F8: Delete
  F9: Properties
  F10: Quit

Provider:
  Ctrl+P: Switch provider
  Ctrl+R: Refresh current pane

General:
  Ctrl+Q: Quit
  Ctrl+F: Filter files
  Ctrl+H: Toggle hidden files`,
          actions: 'Press any key to close'
        };

      case 'provider':
        return {
          title: 'Switch Provider',
          content: `Choose provider:

1. Local File System (file)
2. AWS S3 (s3)
3. Google Cloud Storage (gcs)
4. Azure Blob Storage (az)
5. AIFS Provider (aifs)

Press number to select or ESC to cancel`,
          actions: '1-5: Select | ESC: Cancel'
        };

      case 'input':
        return {
          title: title || 'Input',
          content: `${message || 'Enter value:'}

> ${inputValue}_`,
          actions: 'Enter: Submit | ESC: Cancel'
        };

      case 'progress':
        return {
          title: title || 'Processing',
          content: message || 'Please wait...',
          actions: 'Processing...'
        };

      default:
        return {
          title: title || 'Confirm',
          content: message || 'Are you sure?',
          actions: 'Y: Confirm | N: Cancel | ESC: Cancel'
        };
    }
  };

  const modalContent = getModalContent();

  return (
    <Box
      width="80%"
      height="70%"
      borderStyle="double"
      borderColor="blue"
      flexDirection="column"
    >
      {/* Title */}
      <Box
        borderStyle="single"
        borderColor="blue"
        padding={1}
      >
        <Text color="white" bold>
          {modalContent.title}
        </Text>
      </Box>

      {/* Content */}
      <Box
        flexGrow={1}
        padding={2}
        flexDirection="column"
        justifyContent="center"
      >
        <Text color="white">
          {modalContent.content.split('\n').map((line, index) => (
            <Text key={index}>
              {line}
              {index < modalContent.content.split('\n').length - 1 && '\n'}
            </Text>
          ))}
        </Text>
      </Box>

      {/* Actions */}
      <Box
        borderStyle="single"
        borderColor="blue"
        padding={1}
        flexDirection="row"
        justifyContent="center"
      >
        <Text color="gray">
          {modalContent.actions}
        </Text>
      </Box>
    </Box>
  );
}
