import React from 'react';
import { Box, Text } from 'ink';
import { PaneState } from '../App.js';

interface StatusBarProps {
  leftPane: PaneState;
  rightPane: PaneState;
  currentPane: 'left' | 'right';
}

export function StatusBar({ leftPane, rightPane, currentPane }: StatusBarProps) {
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

  const getProviderName = (provider: string): string => {
    switch (provider) {
      case 'file': return 'Local File System';
      case 's3': return 'AWS S3';
      case 'gcs': return 'Google Cloud Storage';
      case 'az': return 'Azure Blob Storage';
      case 'aifs': return 'AIFS Provider';
      default: return 'Unknown Provider';
    }
  };

  const formatUri = (uri: string, provider: string): string => {
    if (provider === 'file') {
      return uri;
    }
    // For cloud providers, show a shortened version
    const parts = uri.split('/');
    if (parts.length > 3) {
      return `${parts[0]}//${parts[2]}/.../${parts[parts.length - 1]}`;
    }
    return uri;
  };

  const getCurrentItemInfo = (): string => {
    const currentPaneState = currentPane === 'left' ? leftPane : rightPane;
    const currentItem = currentPaneState.items[currentPaneState.selectedIndex];
    
    if (!currentItem) return '';
    
    if (currentItem.isDirectory) {
      return `DIR ${currentItem.size} B ...`;
    } else {
      const size = currentItem.size;
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let unitIndex = 0;
      let fileSize = size;
      
      while (fileSize >= 1024 && unitIndex < units.length - 1) {
        fileSize /= 1024;
        unitIndex++;
      }
      
      return `FILE ${fileSize.toFixed(2)} ${units[unitIndex]}`;
    }
  };

  return (
    <Box
      padding={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      {/* Left pane info */}
      <Box flexDirection="row">
        <Text color={currentPane === 'left' ? 'blue' : 'white'}>
          Left [{getProviderIcon(leftPane.provider)} {getProviderName(leftPane.provider)}]: {formatUri(leftPane.uri, leftPane.provider)}
        </Text>
      </Box>

      {/* Separator */}
      <Text color="gray"> | </Text>

      {/* Right pane info */}
      <Box flexDirection="row">
        <Text color={currentPane === 'right' ? 'blue' : 'white'}>
          Right [{getProviderIcon(rightPane.provider)} {getProviderName(rightPane.provider)}]: {formatUri(rightPane.uri, rightPane.provider)}
        </Text>
      </Box>

      {/* Current item info */}
      <Box flexDirection="row">
        <Text color="gray">
          {getCurrentItemInfo()} | Press P
        </Text>
      </Box>
    </Box>
  );
}
