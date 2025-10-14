import React, { useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { FileItem, PaneState } from '../types.js';

interface FilePaneProps {
  pane: 'left' | 'right';
  state: PaneState;
  isActive: boolean;
  onNavigate: (uri: string) => void;
  onSelect: (index: number) => void;
  onToggleSelection: (item: FileItem) => void;
  onScroll: (offset: number) => void;
  onFilter: (filter: string) => void;
}

export function FilePane({ 
  pane, 
  state, 
  isActive, 
  onNavigate, 
  onSelect, 
  onToggleSelection, 
  onScroll,
  onFilter 
}: FilePaneProps) {
  const { items, selectedIndex, selectedItems, loading, error, provider, scrollOffset, filter } = state;

  // Filter items based on current filter
  const filteredItems = useMemo(() => {
    if (!filter) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

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
        if (selectedIndex < filteredItems.length - 1) {
          onSelect(selectedIndex + 1);
        }
        break;
      case 'enter':
        if (filteredItems[selectedIndex]?.isDirectory) {
          onNavigate(filteredItems[selectedIndex].uri);
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
        if (filteredItems[selectedIndex]) {
          onToggleSelection(filteredItems[selectedIndex]);
        }
        break;
      case 'a':
        if (key.ctrl || key.meta) {
          // Select all
          filteredItems.forEach(item => onToggleSelection(item));
        }
        break;
      case 'c':
        if (key.ctrl || key.meta) {
          // Clear selection
          onSelect(0);
        }
        break;
    }

    // Handle page up/down
    if (key.pageUp) {
      onScroll(Math.max(0, scrollOffset - 10));
    } else if (key.pageDown) {
      onScroll(scrollOffset + 10);
    }

    // Handle home/end
    if (key.home) {
      onSelect(0);
    } else if (key.end) {
      onSelect(filteredItems.length - 1);
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
    
    // Determine file type by extension
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'json':
      case 'yaml':
      case 'yml':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac':
        return '🎵';
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return '📦';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'h':
        return '💻';
      default:
        return '📄';
    }
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
      <Box flexDirection="column" padding={1} height="100%">
        <Box borderStyle="single" borderColor="gray" padding={1} marginBottom={1}>
          <Text color="white" bold>
            {pane === 'left' ? 'Left' : 'Right'} Pane
          </Text>
          <Text color="gray"> - {getProviderIcon(provider)} {provider}</Text>
        </Box>
        <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="yellow">Loading...</Text>
          <Text color="gray">Provider: {getProviderIcon(provider)} {provider}</Text>
          <Text color="gray">URI: {state.uri}</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1} height="100%">
        <Box borderStyle="single" borderColor="red" padding={1} marginBottom={1}>
          <Text color="white" bold>
            {pane === 'left' ? 'Left' : 'Right'} Pane
          </Text>
          <Text color="gray"> - {getProviderIcon(provider)} {provider}</Text>
        </Box>
        <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="red">Error: {error}</Text>
          <Text color="gray">Provider: {getProviderIcon(provider)} {provider}</Text>
          <Text color="gray">URI: {state.uri}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor={isActive ? "blue" : "gray"} padding={1} marginBottom={1}>
        <Text color="white" bold>
          {pane === 'left' ? 'Left' : 'Right'} Pane
        </Text>
        <Text color="gray"> - {getProviderIcon(provider)} {provider}</Text>
        {filter && (
          <Text color="yellow"> | Filter: {filter}</Text>
        )}
      </Box>

      {/* File list */}
      <Box flexDirection="column" flexGrow={1} padding={1}>
        {filteredItems.length === 0 ? (
          <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray">
              {filter ? 'No items match filter' : 'No items found'}
            </Text>
            {filter && (
              <Text color="gray">Press Ctrl+F to clear filter</Text>
            )}
          </Box>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isItemSelected = selectedItems.has(item.uri);
            const icon = getFileIcon(item);
            const size = formatFileSize(item.size);
            
            return (
              <Box key={item.uri} flexDirection="row" marginBottom={0}>
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
          {filteredItems.length} items | {selectedItems.size} selected | {provider}
        </Text>
        {scrollOffset > 0 && (
          <Text color="gray"> | Scroll: {scrollOffset}</Text>
        )}
      </Box>
    </Box>
  );
}
