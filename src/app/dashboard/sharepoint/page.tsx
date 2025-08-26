// src/app/dashboard/sharepoint/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Building2, Plus, Trash2, Pencil, Check } from 'lucide-react';

type SharePointNode = { id: string; name: string; parentId: string | null; children?: SharePointNode[]; type?: string; icon?: string; };

const SharePointStructurePage = () => {
  const [nodes, setNodes] = useState<SharePointNode[]>([]);
  const [structure, setStructure] = useState<SharePointNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sharepoint');
      if (!response.ok) throw new Error('Failed to fetch');
      const data: SharePointNode[] = await response.json();
      setNodes(data);
    } catch (error) { console.error("Error fetching data:", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (nodes.length > 0) {
      const buildTree = (items: SharePointNode[], parentId: string | null = null): SharePointNode[] => {
        return items.filter(item => item.parentId === parentId).map(item => ({ ...item, children: buildTree(items, item.id) }));
      };
      const rootNode = nodes.find(n => !n.parentId);
      if (rootNode) {
        const tree = { ...rootNode, children: buildTree(nodes, rootNode.id) };
        setStructure(tree);
        if (expandedNodes.size === 0) setExpandedNodes(new Set([rootNode.id]));
      }
    }
  }, [nodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
      return newSet;
    });
  };
  
  const handleEditName = async (nodeId: string, newName: string) => {
    setEditingNodeId(null);
    if (!newName || newName === nodes.find(n => n.id === nodeId)?.name) return;
    try {
      const response = await fetch(`/api/sharepoint`, { // --- UPDATED URL
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nodeId, name: newName }), // --- UPDATED BODY
      });
      if (!response.ok) throw new Error('Failed to rename');
      await fetchData();
    } catch (error) { console.error("Error renaming node:", error); }
  };

  const handleDelete = async (nodeId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier et tous ses sous-dossiers?')) {
      try {
        const response = await fetch(`/api/sharepoint`, { // --- UPDATED URL
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: nodeId }), // --- UPDATED BODY
        });
        if (!response.ok) throw new Error('Failed to delete');
        await fetchData();
      } catch (error) { console.error("Error deleting node:", error); }
    }
  };

  const handleAddFolder = async (parentId: string) => {
    const folderName = window.prompt('Nom du nouveau dossier:');
    if (folderName) {
      try {
        const response = await fetch('/api/sharepoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName, parentId }),
        });
        if (!response.ok) throw new Error('Failed to add folder');
        setExpandedNodes(prev => new Set(prev).add(parentId));
        await fetchData();
      } catch (error) { console.error("Error adding folder:", error); }
    }
  };

  const renderNode = (node: SharePointNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div className={`flex items-center gap-2 p-2 rounded-md cursor-pointer group hover:bg-gray-100 ${selectedNodeId === node.id ? 'bg-blue-50' : ''}`}
             style={{ paddingLeft: `${depth * 24 + 8}px` }}
             onClick={() => setSelectedNodeId(node.id)}>
          <div className="w-6 text-gray-400" onClick={(e) => { e.stopPropagation(); hasChildren && toggleNode(node.id); }}>
            {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </div>
          {node.type === 'site' ? <Building2 size={16} className="text-purple-600" /> :
           node.type === 'library' ? <span className="text-lg">{node.icon || '📁'}</span> :
           (isExpanded ? <FolderOpen size={16} className="text-blue-500" /> : <Folder size={16} className="text-gray-500" />)}
          
          {editingNodeId === node.id ?
            (<input type="text" defaultValue={node.name} autoFocus onBlur={(e) => handleEditName(node.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditName(node.id, e.currentTarget.value)}
                    onClick={(e) => e.stopPropagation()} className="p-1 text-sm border rounded-md" />) :
            (<span className="text-sm" onDoubleClick={(e) => { e.stopPropagation(); if (editMode) setEditingNodeId(node.id); }}>{node.name}</span>)}

          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {editMode && (
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }} className="p-1 rounded-md hover:bg-gray-200" title="Renommer"><Pencil size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleAddFolder(node.id); }} className="p-1 rounded-md hover:bg-gray-200" title="Ajouter"><Plus size={14} /></button>
                {node.parentId && <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }} className="p-1 rounded-md hover:bg-gray-200" title="Supprimer"><Trash2 size={14} /></button>}
              </div>
            )}
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="ml-2 pl-4 border-l">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Structure SharePoint</h1>
        <button onClick={() => setEditMode(!editMode)} className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${editMode ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
          {editMode ? <Check size={16} /> : <Pencil size={16} />}
          {editMode ? "Mode Édition" : "Activer Édition"}
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {isLoading ? <p>Chargement...</p> : (structure ? renderNode(structure) : <p>Aucune structure.</p>)}
      </div>
    </div>
  );
};

export default SharePointStructurePage;
