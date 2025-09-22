import React, { useState, useEffect, useCallback } from 'react';
import { Obj } from '../../shared/interfaces/IObjectStore';
import { Job, JobStatus } from '../../shared/interfaces/IJobEngine';
import '../styles/FileBrowser.css';

interface FileBrowserProps {
  initialLeftUri?: string;
  initialRightUri?: string;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  initialLeftUri = 'file:///',
  initialRightUri = 'file:///',
}) => {
  // State for each pane
  const [leftUri, setLeftUri] = useState(initialLeftUri);
  const [rightUri, setRightUri] = useState(initialRightUri);
  const [leftItems, setLeftItems] = useState<Obj[]>([]);
  const [rightItems, setRightItems] = useState<Obj[]>([]);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [selectedLeftItems, setSelectedLeftItems] = useState<Set<string>>(new Set());
  const [selectedRightItems, setSelectedRightItems] = useState<Set<string>>(new Set());
  const [activePane, setActivePane] = useState<'left' | 'right'>('left');
  
  // State for jobs
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showJobs, setShowJobs] = useState(false);
  
  // Load items for a pane
  const loadItems = useCallback(async (uri: string, setItems: React.Dispatch<React.SetStateAction<Obj[]>>, 
                                   setLoading: React.Dispatch<React.SetStateAction<boolean>>,
                                   setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.api.objectStore.list(uri);
      setItems(result.items);
    } catch (error) {
      console.error('Error loading items:', error);
      setError(error instanceof Error ? error.message : String(error));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load items for both panes on initial render
  useEffect(() => {
    loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
    loadItems(rightUri, setRightItems, setRightLoading, setRightError);
  }, [leftUri, rightUri, loadItems]);
  
  // Load jobs
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobList = await window.api.jobs.list();
        setJobs(jobList);
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    };
    
    loadJobs();
    
    // Set up job event listeners
    const unsubscribeProgress = window.api.jobs.onProgress((job) => {
      setJobs(prevJobs => {
        const index = prevJobs.findIndex(j => j.id === job.id);
        if (index >= 0) {
          const newJobs = [...prevJobs];
          newJobs[index] = job;
          return newJobs;
        } else {
          return [job, ...prevJobs];
        }
      });
    });
    
    const unsubscribeCompleted = window.api.jobs.onStatusChange((job) => {
      // Only handle completed jobs
      if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
        return;
      }
      setJobs(prevJobs => {
        const index = prevJobs.findIndex(j => j.id === job.id);
        if (index >= 0) {
          const newJobs = [...prevJobs];
          newJobs[index] = job;
          return newJobs;
        } else {
          return [job, ...prevJobs];
        }
      });
      
      // Refresh the panes when a job completes
      loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
      loadItems(rightUri, setRightItems, setRightLoading, setRightError);
    });
    
    // We don't need separate handlers for failed and canceled jobs
    // as they are handled by the onStatusChange handler above
    
    return () => {
      unsubscribeProgress();
      unsubscribeCompleted();
    };
  }, [leftUri, rightUri, loadItems]);
  
  // Handle navigation
  const handleNavigate = useCallback((uri: string, isDirectory: boolean, pane: 'left' | 'right') => {
    if (!isDirectory) return;
    
    if (pane === 'left') {
      setLeftUri(uri);
      setSelectedLeftItems(new Set());
    } else {
      setRightUri(uri);
      setSelectedRightItems(new Set());
    }
  }, []);
  
  // Handle item selection
  const handleSelect = useCallback((uri: string, pane: 'left' | 'right', multiple: boolean) => {
    setActivePane(pane);
    
    if (pane === 'left') {
      setSelectedLeftItems(prev => {
        const newSelection = new Set(prev);
        if (multiple) {
          if (newSelection.has(uri)) {
            newSelection.delete(uri);
          } else {
            newSelection.add(uri);
          }
        } else {
          newSelection.clear();
          newSelection.add(uri);
        }
        return newSelection;
      });
    } else {
      setSelectedRightItems(prev => {
        const newSelection = new Set(prev);
        if (multiple) {
          if (newSelection.has(uri)) {
            newSelection.delete(uri);
          } else {
            newSelection.add(uri);
          }
        } else {
          newSelection.clear();
          newSelection.add(uri);
        }
        return newSelection;
      });
    }
  }, []);
  
  // Handle copy operation
  const handleCopy = useCallback(async () => {
    const sourcePane = activePane;
    const targetPane = activePane === 'left' ? 'right' : 'left';
    const selectedItems = sourcePane === 'left' ? selectedLeftItems : selectedRightItems;
    const targetUri = sourcePane === 'left' ? rightUri : leftUri;
    
    if (selectedItems.size === 0) return;
    
    for (const srcUri of selectedItems) {
      const srcObj = sourcePane === 'left' 
        ? leftItems.find(item => item.uri === srcUri)
        : rightItems.find(item => item.uri === srcUri);
      
      if (!srcObj) continue;
      
      const fileName = srcObj.name;
      const destUri = `${targetUri}${targetUri.endsWith('/') ? '' : '/'}${fileName}`;
      
      try {
        await window.api.objectStore.copy(srcUri, destUri);
      } catch (error) {
        console.error(`Error copying ${srcUri} to ${destUri}:`, error);
      }
    }
    
    // Refresh the target pane
    if (targetPane === 'left') {
      loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
    } else {
      loadItems(rightUri, setRightItems, setRightLoading, setRightError);
    }
  }, [activePane, leftItems, rightItems, leftUri, rightUri, selectedLeftItems, selectedRightItems, loadItems]);
  
  // Handle move operation
  const handleMove = useCallback(async () => {
    const sourcePane = activePane;
    const targetPane = activePane === 'left' ? 'right' : 'left';
    const selectedItems = sourcePane === 'left' ? selectedLeftItems : selectedRightItems;
    const targetUri = sourcePane === 'left' ? rightUri : leftUri;
    
    if (selectedItems.size === 0) return;
    
    for (const srcUri of selectedItems) {
      const srcObj = sourcePane === 'left' 
        ? leftItems.find(item => item.uri === srcUri)
        : rightItems.find(item => item.uri === srcUri);
      
      if (!srcObj) continue;
      
      const fileName = srcObj.name;
      const destUri = `${targetUri}${targetUri.endsWith('/') ? '' : '/'}${fileName}`;
      
      try {
        await window.api.objectStore.move(srcUri, destUri);
      } catch (error) {
        console.error(`Error moving ${srcUri} to ${destUri}:`, error);
      }
    }
    
    // Refresh both panes
    loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
    loadItems(rightUri, setRightItems, setRightLoading, setRightError);
    
    // Clear selections
    if (sourcePane === 'left') {
      setSelectedLeftItems(new Set());
    } else {
      setSelectedRightItems(new Set());
    }
  }, [activePane, leftItems, rightItems, leftUri, rightUri, selectedLeftItems, selectedRightItems, loadItems]);
  
  // Handle delete operation
  const handleDelete = useCallback(async () => {
    const sourcePane = activePane;
    const selectedItems = sourcePane === 'left' ? selectedLeftItems : selectedRightItems;
    
    if (selectedItems.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`);
    if (!confirmed) return;
    
    for (const uri of selectedItems) {
      const obj = sourcePane === 'left' 
        ? leftItems.find(item => item.uri === uri)
        : rightItems.find(item => item.uri === uri);
      
      if (!obj) continue;
      
      try {
        await window.api.objectStore.delete(uri);
      } catch (error) {
        console.error(`Error deleting ${uri}:`, error);
      }
    }
    
    // Refresh the source pane
    if (sourcePane === 'left') {
      loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
      setSelectedLeftItems(new Set());
    } else {
      loadItems(rightUri, setRightItems, setRightLoading, setRightError);
      setSelectedRightItems(new Set());
    }
  }, [activePane, leftItems, rightItems, leftUri, rightUri, selectedLeftItems, selectedRightItems, loadItems]);
  
  // Handle new folder creation
  const handleNewFolder = useCallback(async () => {
    const targetPane = activePane;
    const targetUri = targetPane === 'left' ? leftUri : rightUri;
    
    const folderName = window.prompt('Enter folder name:');
    if (!folderName) return;
    
    const newFolderUri = `${targetUri}${targetUri.endsWith('/') ? '' : '/'}${folderName}`;
    
    try {
      await window.api.objectStore.mkdir(newFolderUri);
      
      // Refresh the target pane
      if (targetPane === 'left') {
        loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
      } else {
        loadItems(rightUri, setRightItems, setRightLoading, setRightError);
      }
    } catch (error) {
      console.error(`Error creating folder ${newFolderUri}:`, error);
      window.alert(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [activePane, leftUri, rightUri, loadItems]);
  
  // Handle upload
  const handleUpload = useCallback(async () => {
    const targetPane = activePane;
    const targetUri = targetPane === 'left' ? leftUri : rightUri;
    
    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      });
      
      if (result.canceled || result.filePaths.length === 0) return;
      
      for (const filePath of result.filePaths) {
        const fileName = filePath.split(/[\\/]/).pop() || '';
        const destUri = `${targetUri}${targetUri.endsWith('/') ? '' : '/'}${fileName}`;
        
        try {
          await window.api.objectStore.put(filePath, destUri);
        } catch (error) {
          console.error(`Error uploading ${filePath} to ${destUri}:`, error);
        }
      }
      
      // Refresh the target pane
      if (targetPane === 'left') {
        loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError);
      } else {
        loadItems(rightUri, setRightItems, setRightLoading, setRightError);
      }
    } catch (error) {
      console.error('Error in upload dialog:', error);
    }
  }, [activePane, leftUri, rightUri, loadItems]);
  
  // Handle download
  const handleDownload = useCallback(async () => {
    const sourcePane = activePane;
    const selectedItems = sourcePane === 'left' ? selectedLeftItems : selectedRightItems;
    
    if (selectedItems.size === 0) return;
    
    for (const uri of selectedItems) {
      const obj = sourcePane === 'left' 
        ? leftItems.find(item => item.uri === uri)
        : rightItems.find(item => item.uri === uri);
      
      if (!obj || obj.isDirectory) continue;
      
      try {
        const result = await window.api.dialog.showSaveDialog({
          defaultPath: obj.name
        });
        
        if (result.canceled || !result.filePath) continue;
        
        await window.api.objectStore.get(uri, result.filePath);
      } catch (error) {
        console.error(`Error downloading ${uri}:`, error);
      }
    }
  }, [activePane, leftItems, rightItems, selectedLeftItems, selectedRightItems]);
  
  // Handle job cancellation
  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      await window.api.jobs.cancel(jobId);
    } catch (error) {
      console.error(`Error canceling job ${jobId}:`, error);
    }
  }, []);
  
  // Handle clearing finished jobs
  const handleClearFinishedJobs = useCallback(async () => {
    try {
      await window.api.jobs.clear();
      setJobs(prevJobs => prevJobs.filter(job => 
        job.status !== JobStatus.COMPLETED && 
        job.status !== JobStatus.FAILED && 
        job.status !== JobStatus.CANCELED
      ));
    } catch (error) {
      console.error('Error clearing jobs:', error);
    }
  }, []);
  
  // Render file/directory item
  const renderItem = (item: Obj, isSelected: boolean, pane: 'left' | 'right') => {
    return (
      <div 
        key={item.uri}
        className={`file-item ${isSelected ? 'selected' : ''} ${item.isDirectory ? 'directory' : 'file'}`}
        onClick={(e) => handleSelect(item.uri, pane, e.ctrlKey || e.metaKey)}
        onDoubleClick={() => handleNavigate(item.uri, item.isDirectory, pane)}
      >
        <div className="file-icon">{item.isDirectory ? '📁' : '📄'}</div>
        <div className="file-name">{item.name}</div>
        {!item.isDirectory && (
          <div className="file-size">{formatFileSize(item.size || 0)}</div>
        )}
      </div>
    );
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };
  
  // Render job item
  const renderJob = (job: Job) => {
    return (
      <div key={job.id} className={`job-item job-${job.status.toLowerCase()}`}>
        <div className="job-header">
          <div className="job-name">{job.name}</div>
          <div className="job-status">{job.status}</div>
        </div>
        <div className="job-description">{job.description}</div>
        {job.status === JobStatus.RUNNING && (
          <div className="job-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(job.progress.current / job.progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {job.progress.message} ({Math.round((job.progress.current / job.progress.total) * 100)}%)
            </div>
          </div>
        )}
        {job.status === JobStatus.FAILED && job.error && (
          <div className="job-error">{job.error}</div>
        )}
        {job.status === JobStatus.RUNNING && job.cancelable && (
          <button className="job-cancel-btn" onClick={() => handleCancelJob(job.id)}>Cancel</button>
        )}
      </div>
    );
  };
  
  return (
    <div className="file-browser">
      <div className="toolbar">
        <button onClick={handleCopy} disabled={selectedLeftItems.size === 0 && selectedRightItems.size === 0}>Copy</button>
        <button onClick={handleMove} disabled={selectedLeftItems.size === 0 && selectedRightItems.size === 0}>Move</button>
        <button onClick={handleDelete} disabled={selectedLeftItems.size === 0 && selectedRightItems.size === 0}>Delete</button>
        <button onClick={handleNewFolder}>New Folder</button>
        <button onClick={handleUpload}>Upload</button>
        <button onClick={handleDownload} disabled={selectedLeftItems.size === 0 && selectedRightItems.size === 0}>Download</button>
        <button onClick={() => setShowJobs(!showJobs)}>
          {showJobs ? 'Hide Jobs' : `Jobs (${jobs.filter(j => j.status === JobStatus.RUNNING).length})`}
        </button>
      </div>
      
      {showJobs && (
        <div className="jobs-panel">
          <div className="jobs-header">
            <h3>Jobs</h3>
            <button onClick={handleClearFinishedJobs}>Clear Finished</button>
          </div>
          <div className="jobs-list">
            {jobs.length === 0 ? (
              <div className="no-jobs">No jobs</div>
            ) : (
              jobs.map(renderJob)
            )}
          </div>
        </div>
      )}
      
      <div className="panes-container">
        <div className={`pane ${activePane === 'left' ? 'active' : ''}`}>
          <div className="pane-header">
            <input 
              type="text" 
              value={leftUri} 
              onChange={(e) => setLeftUri(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError)}
            />
            <button onClick={() => loadItems(leftUri, setLeftItems, setLeftLoading, setLeftError)}>Refresh</button>
          </div>
          
          <div className="pane-content" onClick={() => setActivePane('left')}>
            {leftLoading ? (
              <div className="loading">Loading...</div>
            ) : leftError ? (
              <div className="error">{leftError}</div>
            ) : leftItems.length === 0 ? (
              <div className="empty">No items</div>
            ) : (
              leftItems.map(item => renderItem(item, selectedLeftItems.has(item.uri), 'left'))
            )}
          </div>
        </div>
        
        <div className={`pane ${activePane === 'right' ? 'active' : ''}`}>
          <div className="pane-header">
            <input 
              type="text" 
              value={rightUri} 
              onChange={(e) => setRightUri(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadItems(rightUri, setRightItems, setRightLoading, setRightError)}
            />
            <button onClick={() => loadItems(rightUri, setRightItems, setRightLoading, setRightError)}>Refresh</button>
          </div>
          
          <div className="pane-content" onClick={() => setActivePane('right')}>
            {rightLoading ? (
              <div className="loading">Loading...</div>
            ) : rightError ? (
              <div className="error">{rightError}</div>
            ) : rightItems.length === 0 ? (
              <div className="empty">No items</div>
            ) : (
              rightItems.map(item => renderItem(item, selectedRightItems.has(item.uri), 'right'))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;