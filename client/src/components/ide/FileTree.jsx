import React, { useState } from 'react';
import { useIdeStore } from '../../store/ideStore';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Lock,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const FileTreeNode = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { activeFilePath, setActiveFile } = useIdeStore();

  const isFolder = node.type === 'folder' || Boolean(node.children);
  const isSelected = activeFilePath === node.path;
  const isReadOnly = node.isReadOnly || node.path?.startsWith('__tests__') || node.path?.includes('.test.');

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      setActiveFile(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 14 + 10}px` }}
        className={`flex items-center justify-between py-1 px-2 cursor-pointer text-xs font-mono transition select-none ${
          isSelected
            ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500 font-medium'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          {isFolder ? (
            <>
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-3 shrink-0" />
              <FileCode className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {isReadOnly && (
          <span title="Read-Only file / test case" className="shrink-0 ml-1">
            <Lock className="w-2.5 h-2.5 text-amber-500/80" />
          </span>
        )}
      </div>

      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((childNode) => (
            <FileTreeNode key={childNode.path} node={childNode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileTree() {
  const { fileTree } = useIdeStore();

  return (
    <div className="h-full flex flex-col bg-slate-950 border-r border-slate-800">
      <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Explorer / Scaffolding
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {fileTree && fileTree.length > 0 ? (
          fileTree.map((rootNode) => (
            <FileTreeNode key={rootNode.path} node={rootNode} />
          ))
        ) : (
          <div className="p-4 text-xs font-mono text-slate-500 text-center">
            No files available in scaffolding
          </div>
        )}
      </div>
    </div>
  );
}

