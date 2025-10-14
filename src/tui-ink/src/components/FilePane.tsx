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

  // Filter items based on current filter and apply scroll offset
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (filter) {
      filtered = items.filter(item => 
        item.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Apply scroll offset to show items starting from scrollOffset
    return filtered.slice(scrollOffset);
  }, [items, filter, scrollOffset]);

  // Note: Keyboard input is handled globally in App.tsx
  // This component only renders the file list

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
      return item.name === '..' ? '↑' : 'D';
    }
    
    // Determine file type by extension
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'json':
      case 'yaml':
      case 'yml':
        return 'T';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return 'I';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return 'V';
      case 'mp3':
      case 'wav':
      case 'flac':
        return 'A';
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return 'Z';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'h':
        return 'C';
      default:
        return 'F';
    }
  };

  const getProviderIcon = (provider: string): string => {
    switch (provider) {
      case 'file': return 'F';
      case 's3': return 'S';
      case 'gcs': return 'G';
      case 'az': return 'A';
      case 'aifs': return 'I';
      default: return '?';
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
      <Box 
        borderStyle="single" 
        borderColor={isActive ? "blue" : "gray"} 
        padding={1} 
        marginBottom={1}
      >
        <Text color={isActive ? "white" : "white"} bold>
          {pane === 'left' ? 'Left' : 'Right'} Pane {isActive ? '← ACTIVE' : ''}
        </Text>
        <Text color={isActive ? "white" : "gray"}> - {getProviderIcon(provider)} {provider}</Text>
        {filter && (
          <Text color="yellow"> | Filter: {filter}</Text>
        )}
      </Box>

      {/* File list - use flexGrow to fill remaining space */}
      <Box flexDirection="column" flexGrow={1} padding={1} height="100%">
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
            const actualIndex = index + scrollOffset;
            const isSelected = actualIndex === selectedIndex;
            const isItemSelected = selectedItems.has(item.uri);
            const icon = getFileIcon(item);
            const size = formatFileSize(item.size);
            
            return (
              <Box key={item.uri} flexDirection="row" marginBottom={0}>
                <Text color={isItemSelected ? 'green' : 'white'}>
                  {isItemSelected ? '✓ ' : '  '}
                </Text>
                <Text
                  color={isSelected ? 'black' : isItemSelected ? 'green' : 'white'}
                  backgroundColor={isSelected ? 'yellow' : undefined}
                  bold={isSelected}
                >
                  {icon} {item.name}
                </Text>
                {size && (
                  <Text color={isSelected ? 'black' : 'gray'}> {size}</Text>
                )}
                {isSelected && (
                  <Text color="yellow" bold> ←</Text>
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
