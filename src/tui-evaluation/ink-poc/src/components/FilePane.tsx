import React, { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { FileItem, PaneState } from '../App.js';

interface FilePaneProps {
  pane: 'left' | 'right';
  state: PaneState;
  isActive: boolean;
  onNavigate: (uri: string) => void;
  onSelect: (index: number) => void;
  onToggleSelection: (item: FileItem) => void;
}

export function FilePane({ pane, state, isActive, onNavigate, onSelect, onToggleSelection }: FilePaneProps) {
  const { items, selectedIndex, selectedItems, loading, error, provider } = state;

  // Handle keyboard input when this pane is active
  useInput((input: string, key: any) => {
    if (!isActive) return;

    switch (input) {
      case 'up':
      case 'k':
        if (selectedIndex > 0) {
          onSelect(selectedIndex - 1);
        }
        break;
      case 'down':
      case 'j':
        if (selectedIndex < items.length - 1) {
          onSelect(selectedIndex + 1);
        }
        break;
      case 'enter':
        if (items[selectedIndex]?.isDirectory) {
          onNavigate(items[selectedIndex].uri);
        }
        break;
      case 'backspace':
      case 'h':
        // Go up one directory
        const currentUri = state.uri;
        const parentUri = currentUri.split('/').slice(0, -1).join('/') || '/';
        if (parentUri !== currentUri) {
          onNavigate(parentUri);
        }
        break;
      case ' ':
        // Toggle selection
        if (items[selectedIndex]) {
          onToggleSelection(items[selectedIndex]);
        }
        break;
    }
  }, { isActive });

  const formatFileSize = (size: number): string => {
    if (size === 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `(${fileSize.toFixed(2)} ${units[unitIndex]})`;
  };

  const getFileIcon = (item: FileItem): string => {
    if (item.isDirectory) {
      return '📁';
    }
    return '📄';
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider) {
      case 'file': return '📁';
      case 's3': return '☁️';
      case 'gcs': return '🌐';
      case 'az': return '🔷';
      case 'aifs': return '🤖';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Loading...</Text>
        <Text color="gray">Provider: {getProviderIcon(provider)} {provider}</Text>
        <Text color="gray">URI: {state.uri}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Provider: {getProviderIcon(provider)} {provider}</Text>
        <Text color="gray">URI: {state.uri}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text color="white" bold>
          {pane === 'left' ? 'Left' : 'Right'} Pane
        </Text>
        <Text color="gray"> - {getProviderIcon(provider)} {provider}</Text>
      </Box>

      {/* File list */}
      <Box flexDirection="column" flexGrow={1} padding={1}>
        {items.length === 0 ? (
          <Text color="gray">No items found</Text>
        ) : (
          items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isItemSelected = selectedItems.has(item.uri);
            const icon = getFileIcon(item);
            const size = formatFileSize(item.size);
            
            return (
              <Box key={item.uri} flexDirection="row">
                <Text color={isItemSelected ? 'green' : 'white'}>
                  {isItemSelected ? '✓ ' : '  '}
                </Text>
                <Text
                  color={isSelected ? 'blue' : isItemSelected ? 'green' : 'white'}
                  backgroundColor={isSelected ? 'blue' : undefined}
                  inverse={isSelected}
                >
                  {icon} {item.name}
                </Text>
                {size && (
                  <Text color="gray"> {size}</Text>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer with info */}
      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray">
          {items.length} items | {selectedItems.size} selected | {provider}
        </Text>
      </Box>
    </Box>
  );
}
