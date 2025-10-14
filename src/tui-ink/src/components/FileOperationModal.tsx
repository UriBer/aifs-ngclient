import React from 'react';
import { Box, Text } from 'ink';
import { FileItem } from '../types.js';

interface FileOperationModalProps {
  isOpen: boolean;
  type: 'copy' | 'move' | 'delete' | 'rename' | 'create';
  items: FileItem[];
  destination?: string;
  newName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
}

export function FileOperationModal({
  isOpen,
  type,
  items,
  destination,
  newName,
  onConfirm,
  onCancel,
  onInputChange,
  inputValue = '',
}: FileOperationModalProps) {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'copy': return 'Copy Files';
      case 'move': return 'Move Files';
      case 'delete': return 'Delete Files';
      case 'rename': return 'Rename File';
      case 'create': return 'Create Directory';
      default: return 'File Operation';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'copy':
        return `Copy ${items.length} item(s) to ${destination || 'destination'}?`;
      case 'move':
        return `Move ${items.length} item(s) to ${destination || 'destination'}?`;
      case 'delete':
        return `Delete ${items.length} item(s)? This action cannot be undone.`;
      case 'rename':
        return `Rename "${items[0]?.name}" to:`;
      case 'create':
        return `Create directory "${newName || 'new-directory'}" in ${destination || 'current location'}?`;
      default:
        return 'Confirm operation?';
    }
  };

  const getItemList = () => {
    if (items.length === 0) return null;
    
    const maxItems = 5;
    const displayItems = items.slice(0, maxItems);
    const remainingCount = items.length - maxItems;

    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Items:</Text>
        {displayItems.map((item, index) => (
          <Box key={item.uri} flexDirection="row">
            <Text color="white">
              {item.isDirectory ? '📁' : '📄'} {item.name}
            </Text>
            {item.size > 0 && (
              <Text color="gray"> ({item.size} bytes)</Text>
            )}
          </Box>
        ))}
        {remainingCount > 0 && (
          <Text color="gray">... and {remainingCount} more items</Text>
        )}
      </Box>
    );
  };

  return (
    <Box
      width="80%"
      height="60%"
      borderStyle="single"
      borderColor="yellow"
      padding={2}
      flexDirection="column"
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          {getTitle()}
        </Text>
      </Box>

      {/* Message */}
      <Box marginBottom={1}>
        <Text color="white">
          {getMessage()}
        </Text>
      </Box>

      {/* Item list */}
      {getItemList()}

      {/* Input field for rename/create */}
      {(type === 'rename' || type === 'create') && onInputChange && (
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Name:</Text>
          <Box borderStyle="single" borderColor="blue" padding={1}>
            <Text color="white">{inputValue}</Text>
          </Box>
        </Box>
      )}

      {/* Action buttons */}
      <Box marginTop={2} flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text color="green">[Y] Yes</Text>
          <Text color="white"> | </Text>
          <Text color="red">[N] No</Text>
        </Box>
        <Box flexDirection="row">
          <Text color="gray">Press Y to confirm, N to cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
