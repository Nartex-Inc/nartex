// src/app/dashboard/sharepoint/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Lock, Shield, Edit, Star, Building2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

// Define a type for our data nodes
type SharePointNode = {
  id: string;
  name: string;
  parentId: string | null;
  children?: SharePointNode[];
  // Add other properties from your schema as needed
  type?: string;
  icon?: string;
  restricted?: boolean;
  highSecurity?: boolean;
};

const SharePointStructurePage = () => {
  const [nodes, setNodes] = useState<SharePointNode[]>([]);
  const [structure, setStructure] = useState<SharePointNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // --- NEW: Function to fetch data from our API ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sharepoint');
      if (!response.ok) throw new Error('Failed to fetch');
      const data: SharePointNode[] = await response.json();
      setNodes(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Fetch data on component mount ---
  useEffect(() => {
    fetchData();
  }, []);

  // --- NEW: Effect to build the tree structure whenever the flat list of nodes changes ---
  useEffect(() => {
    if (nodes.length > 0) {
      const buildTree = (items: SharePointNode[], parentId: string | null = null): SharePointNode[] => {
        return items
          .filter(item => item.parentId === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id),
          }));
      };
      // Assuming the root node is the one with a null parentId
      const rootNode = nodes.find(n => !n.parentId);
      if (rootNode) {
        const tree = { ...rootNode, children: buildTree(nodes, rootNode.id) };
        setStructure(tree);
        setExpandedNodes(new Set([rootNode.id]));
      }
    }
  }, [nodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // --- UPDATED: Handler to rename a node ---
  const handleEditName = async (nodeId: string, newName: string) => {
    if (!newName) return;
    try {
      const response = await fetch(`/api/sharepoint/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error('Failed to rename');
      await fetchData(); // Refetch all data to ensure consistency
    } catch (error) {
      console.error("Error renaming node:", error);
    } finally {
      setEditingNodeId(null);
    }
  };

  // --- UPDATED: Handler to delete a node ---
  const handleDelete = async (nodeId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier et tous ses sous-dossiers?')) {
      try {
        const response = await fetch(`/api/sharepoint/${nodeId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete');
        await fetchData(); // Refetch all data
      } catch (error) {
        console.error("Error deleting node:", error);
      }
    }
  };

  // --- UPDATED: Handler to add a new folder ---
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
        setExpandedNodes(prev => new Set(prev).add(parentId)); // Keep parent expanded
        await fetchData(); // Refetch all data
      } catch (error) {
        console.error("Error adding folder:", error);
      }
    }
  };

  const renderNode = (node: SharePointNode, depth = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => setSelectedNodeId(node.id)}
        >
          {hasChildren && (
            <span onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }} className="p-1">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          
          {!hasChildren && <span className="w-6"></span>}
          
          {node.type === 'site' && <Building2 className="w-5 h-5 text-purple-500" />}
          {node.type === 'library' && <span className="text-xl">{node.icon || '📁'}</span>}
          {!node.type && (isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-gray-500" />)}
          
          {isEditing ? (
            <input
              type="text"
              defaultValue={node.name}
              className="px-2 py-1 border rounded text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditName(node.id, e.currentTarget.value);
                if (e.key === 'Escape') setEditingNodeId(null);
              }}
              onBlur={(e) => handleEditName(node.id, e.currentTarget.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span onDoubleClick={(e) => { e.stopPropagation(); if (editMode) setEditingNodeId(node.id); }}>
              {node.name}
            </span>
          )}
          
          <div className="ml-auto flex gap-2 items-center">
            {editMode && (
              <div className="hidden group-hover:flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }} className="p-1 hover:bg-blue-100 rounded" title="Renommer">
                  <Pencil className="w-3 h-3 text-blue-600" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAddFolder(node.id); }} className="p-1 hover:bg-green-100 rounded" title="Ajouter un sous-dossier">
                  <Plus className="w-3 h-3 text-green-600" />
                </button>
                {node.parentId && ( // Prevent deleting the root node
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }} className="p-1 hover:bg-red-100 rounded" title="Supprimer">
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-2 border-l border-gray-200">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div>Chargement de la structure...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Structure SharePoint</h1>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${editMode ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {editMode ? "Mode Édition Actif" : "Activer l'Édition"}
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          {structure ? renderNode(structure) : <p>Aucune structure trouvée. Créez un dossier racine pour commencer.</p>}
        </div>
      </div>
    </div>
  );
};

export default SharePointStructurePage;
