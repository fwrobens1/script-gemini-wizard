import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileNode {
  name: string;
  type: "folder" | "script" | "service";
  children?: FileNode[];
  className?: string;
}

interface FileExplorerProps {
  structure: any;
}

const TreeNode = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        {node.type === "folder" || node.type === "service" ? (
          <Folder className="w-4 h-4 text-accent" />
        ) : (
          <File className="w-4 h-4 text-primary" />
        )}
        
        <span className="text-sm text-foreground font-mono">{node.name}</span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, idx) => (
            <TreeNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer = ({ structure }: FileExplorerProps) => {
  const convertToTree = (obj: any): FileNode[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    return Object.entries(obj).map(([key, value]) => {
      const node: FileNode = {
        name: key,
        type: "folder"
      };

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length > 0) {
          node.children = convertToTree(value);
        }
      }

      return node;
    });
  };

  const tree = convertToTree(structure);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Explorer</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {tree.length > 0 ? (
            tree.map((node, idx) => (
              <TreeNode key={`${node.name}-${idx}`} node={node} />
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No game structure loaded.
              <br />
              Run the plugin in Roblox Studio to sync.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};