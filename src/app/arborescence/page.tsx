'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Folder, FolderOpen, Lock, Shield, Edit, Eye, Star, Building2, Plus, Trash2, Save, Download, Pencil, Check, X, Copy } from 'lucide-react';

// Define the types for our data structure
interface SharePointNode {
  id: string;
  name: string;
  type?: 'site' | 'library';
  icon?: string;
  permissions?: 'inherit' | { edit: string[]; read: string[] };
  restricted?: boolean;
  highSecurity?: boolean;
  children?: SharePointNode[];
}

const EditableSharePointStructure = () => {
  const [structure, setStructure] = useState<SharePointNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<SharePointNode | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    // In a real application, you would fetch this data from your API
    const initialStructure: SharePointNode = {
      id: 'root',
      name: 'GROUPE SINTO - SharePoint',
      type: 'site',
      children: [
        {
          id: 'admin-finance',
          name: 'ADMIN – FINANCE',
          type: 'library',
          icon: '💰',
          children: [
            {
              id: 'admin-principal',
              name: 'PRINCIPAL',
              permissions: { edit: ['SG-ADMIN-FINANCE-EXECUTIF', 'SG-ADMIN-FINANCE-ALL'], read: [] },
              children: [
                { id: 'listes-prix', name: 'Listes de prix', permissions: 'inherit' },
                { id: 'admin-gestion', name: 'Administration & gestion', permissions: 'inherit' },
              ]
            },
            {
              id: 'admin-executif',
              name: 'EXÉCUTIF',
              permissions: { edit: ['SG-ADMIN-FINANCE-EXECUTIF'], read: ['SG-ADMIN-FINANCE-ALL'] },
              restricted: true,
              children: [
                { id: 'etats-financiers', name: 'États financiers', permissions: 'inherit' },
                { id: 'budgets', name: 'Budgets', permissions: 'inherit' },
              ]
            },
          ]
        },
        // ... (rest of your initial structure)
      ]
    };
    setStructure(initialStructure);
  }, []);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const updateNodeInStructure = (node: SharePointNode, nodeId: string, updates: Partial<SharePointNode>): SharePointNode => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeInStructure(child, nodeId, updates))
      };
    }
    return node;
  };

  const deleteNodeFromStructure = (node: SharePointNode, nodeId: string): SharePointNode => {
    if (node.children) {
      return {
        ...node,
        children: node.children.filter(child => child.id !== nodeId).map(child => deleteNodeFromStructure(child, nodeId))
      };
    }
    return node;
  };

  const addNodeToStructure = (node: SharePointNode, parentId: string, newNode: SharePointNode): SharePointNode => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      };
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => addNodeToStructure(child, parentId, newNode))
      };
    }
    return node;
  };

  const handleEditName = (nodeId: string, newName: string) => {
    if (structure) {
        setStructure(updateNodeInStructure(structure, nodeId, { name: newName }));
    }
    setEditingNode(null);
  };

  const handleDelete = (nodeId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier et tous ses sous-dossiers?')) {
        if (structure) {
            setStructure(deleteNodeFromStructure(structure, nodeId));
        }
      setSelectedNode(null);
    }
  };

  const handleAddFolder = (parentId: string) => {
    const folderName = window.prompt('Nom du nouveau dossier:');
    if (folderName) {
      const newFolder: SharePointNode = {
        id: `folder-${Date.now()}`,
        name: folderName,
        permissions: 'inherit',
        children: []
      };
      if (structure) {
        setStructure(addNodeToStructure(structure, parentId, newFolder));
      }
      setExpandedNodes(prev => new Set([...prev, parentId]));
    }
  };

  const handleUpdatePermissions = (nodeId: string, permissions: { edit: string[], read: string[] }) => {
    if (structure) {
        setStructure(updateNodeInStructure(structure, nodeId, { permissions }));
    }
    setSelectedNode(prev => (prev ? { ...prev, permissions } : null));
  };

  const exportToJSON = () => {
    if (structure) {
        const dataStr = JSON.stringify(structure, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'sharepoint-structure.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
  };

  const getPermissionBadge = (permissions: SharePointNode['permissions']) => {
    if (!permissions || permissions === 'inherit') return null;
    
    const badges = [];
    if (permissions.edit?.length > 0) {
      badges.push(
        <span key="edit" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Edit className="w-3 h-3" />
          {permissions.edit.length} groupe{permissions.edit.length > 1 ? 's' : ''}
        </span>
      );
    }
    if (permissions.read?.length > 0) {
      badges.push(
        <span key="read" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Eye className="w-3 h-3" />
          {permissions.read.length} groupe{permissions.read.length > 1 ? 's' : ''}
        </span>
      );
    }
    return badges;
  };

  const renderNode = (node: SharePointNode, depth = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isEditing = editingNode === node.id;
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group
            ${isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
            ${node.restricted ? 'border-l-2 border-orange-300' : ''}
            ${node.highSecurity ? 'border-l-2 border-red-400' : ''}
          `}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            setSelectedNode(node);
          }}
        >
          {hasChildren && (
            <span className="text-gray-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
          
          {node.type === 'site' && <Building2 className="w-5 h-5 text-purple-500" />}
          {node.type === 'library' && (
            <span className="text-xl">{node.icon || '📁'}</span>
          )}
          {!node.type && (isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-gray-500" />)}
          
          {isEditing ? (
            <input
              type="text"
              defaultValue={node.name}
              className="px-2 py-1 border rounded text-sm flex-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                  handleEditName(node.id, target.value);
                } else if (e.key === 'Escape') {
                  setEditingNode(null);
                }
              }}
              onBlur={(e) => handleEditName(node.id, e.target.value)}
            />
          ) : (
            <span className={`font-medium ${node.type === 'library' ? 'text-gray-900' : 'text-gray-700'} ${node.restricted ? 'flex items-center gap-1' : ''}`}>
              {node.name}
              {node.restricted && <Lock className="w-3 h-3 text-orange-500 ml-1" />}
              {node.highSecurity && <Shield className="w-3 h-3 text-red-500 ml-1" />}
            </span>
          )}
          
          <div className="ml-auto flex gap-2 items-center">
            {getPermissionBadge(node.permissions)}
            
            {editMode && node.type !== 'site' && (
              <div className="hidden group-hover:flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingNode(node.id);
                  }}
                  className="p-1 hover:bg-blue-100 rounded"
                  title="Renommer"
                >
                  <Pencil className="w-3 h-3 text-blue-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFolder(node.id);
                  }}
                  className="p-1 hover:bg-green-100 rounded"
                  title="Ajouter un sous-dossier"
                >
                  <Plus className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(node.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-2">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const PermissionEditor = ({ node }: { node: SharePointNode }) => {
    if (!node || node.permissions === 'inherit' || typeof node.permissions === 'undefined') return null;
    
    const [editGroups, setEditGroups] = useState(node.permissions.edit || []);
    const [readGroups, setReadGroups] = useState(node.permissions.read || []);
    const [newEditGroup, setNewEditGroup] = useState('');
    const [newReadGroup, setNewReadGroup] = useState('');
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Permissions détaillées
          </h3>
          {editMode && (
            <button
              onClick={() => handleUpdatePermissions(node.id, { edit: editGroups, read: readGroups })}
              className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Edit className="w-4 h-4 text-green-600" />
              Accès en édition
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {editGroups.map(group => (
                <span key={group} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                  {group}
                  {editMode && (
                    <button
                      onClick={() => setEditGroups(editGroups.filter(g => g !== group))}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un groupe..."
                  value={newEditGroup}
                  onChange={(e) => setNewEditGroup(e.target.value)}
                  className="px-2 py-1 border rounded text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEditGroup) {
                      setEditGroups([...editGroups, newEditGroup]);
                      setNewEditGroup('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newEditGroup) {
                      setEditGroups([...editGroups, newEditGroup]);
                      setNewEditGroup('');
                    }
                  }}
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              Accès en lecture seule
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {readGroups.map(group => (
                <span key={group} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
                  {group}
                  {editMode && (
                    <button
                      onClick={() => setReadGroups(readGroups.filter(g => g !== group))}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un groupe..."
                  value={newReadGroup}
                  onChange={(e) => setNewReadGroup(e.target.value)}
                  className="px-2 py-1 border rounded text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newReadGroup) {
                      setReadGroups([...readGroups, newReadGroup]);
                      setNewReadGroup('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newReadGroup) {
                      setReadGroups([...readGroups, newReadGroup]);
                      setNewReadGroup('');
                    }
                  }}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!structure) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur-lg bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Structure SharePoint - Mode Édition</h1>
                <p className="text-sm text-gray-500">GROUPE SINTO</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2
                  ${editMode 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}
                `}
              >
                {editMode ? (
                  <>
                    <Check className="w-4 h-4" />
                    Mode Édition Actif
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    Activer l'Édition
                  </>
                )}
              </button>
              
              <button
                onClick={exportToJSON}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter JSON
              </button>
              
              <button
                onClick={() => {
                  const json = window.prompt('Coller le JSON ici:');
                  if (json) {
                    try {
                      const parsed = JSON.parse(json);
                      setStructure(parsed);
                      alert('Structure importée avec succès!');
                    } catch (e) {
                      alert('Erreur lors de l\'import du JSON');
                    }
                  }
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium text-sm flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Importer JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Explorer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-500" />
                  Arborescence des dossiers
                </h2>
                {editMode && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    ✏️ Mode édition activé - Survolez les dossiers pour voir les options
                  </p>
                )}
              </div>
              
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {renderNode(structure)}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 sticky top-24" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            {/* Permission Editor - Always on top */}
            {selectedNode && selectedNode.permissions !== 'inherit' && typeof selectedNode.permissions !== 'undefined' && (
              <PermissionEditor node={selectedNode} />
            )}
            
            {/* Legend */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Légende
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">Accès restreint</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700">Haute sécurité</span>
                </div>
                <div className="flex items-center gap-3">
                  <Edit className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Permissions d'édition</span>
                </div>
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Lecture seule</span>
                </div>
              </div>
              
              {editMode && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Actions disponibles:</p>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-3 h-3" />
                      <span>Renommer les dossiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Plus className="w-3 h-3" />
                      <span>Ajouter des sous-dossiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer des dossiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      <span>Modifier les permissions</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableSharePointStructure;
