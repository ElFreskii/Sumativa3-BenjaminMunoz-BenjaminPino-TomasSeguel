import React, { useState, useEffect } from 'react';
import './App.css';

// --- UTILIDADES DE SEGURIDAD Y DESARROLLO ---
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
};

const validate = (val, minLength = 3) => {
  return typeof val === 'string' && sanitize(val).length >= minLength;
};

const getFromLS = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error leyendo LocalStorage:", error);
    return null;
  }
};

const saveToLS = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error guardando en LocalStorage:", error);
    showToast("Error crítico: No se pudo guardar la información.", true);
  }
};

// --- SISTEMA DE NOTIFICACIONES ---
const showToast = (message, isError = false) => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// --- COMPONENTE DE AUTENTICACIÓN ---
const AuthScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate(user, 4) || !validate(pass, 6)) {
      showToast("Usuario (mín 4 carácteres) y Contraseña (mín 6) requeridos.", true);
      return;
    }
    const safeUser = sanitize(user.toLowerCase());
    const safePass = btoa(pass); 
    
    const users = getFromLS('app_users') || {};
    
    if (isRegister) {
      if (users[safeUser]) {
        showToast("El usuario ya existe.", true);
        return;
      }
      users[safeUser] = { password: safePass, collections: [] };
      saveToLS('app_users', users);
      showToast("Registro exitoso. Iniciando sesión...");
      onLogin(safeUser, users);
    } else {
      if (!users[safeUser] || users[safeUser].password !== safePass) {
        showToast("Credenciales incorrectas.", true);
        return;
      }
      onLogin(safeUser, users);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Ágora de Reliquias</h2>
        <p style={{ marginBottom: '2rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Registra tu acceso al museo personal' : 'Inicia sesión para contemplar tu colección'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input className="form-control" type="text" value={user} onChange={e => setUser(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input className="form-control" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '1rem' }}>
            {isRegister ? 'Crear Cuenta' : 'Acceder'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo aquí? Crea una cuenta'}
        </p>
      </div>
    </div>
  );
};

// --- COMPONENTE MODAL CRUD ---
const CrudModal = ({ title, fields, initialState, onClose, onSave }) => {
  const [form, setForm] = useState(initialState);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!validate(form.name)) {
      showToast("El nombre es obligatorio (mín 3 caracteres).", true);
      return;
    }

    onSave({
      ...form,
      name: sanitize(form.name),
      description: sanitize(form.description || '')
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="form-group">
          <label>Nombre {fields.includes('description') ? 'Objeto' : 'Colección'}</label>
          <input className="form-control" value={form.name} onChange={e => handleChange('name', e.target.value)} autoFocus />
        </div>
        
        {fields.includes('description') && (
          <>
            <div className="form-group">
              <label>Descripción / Procedencia</label>
              <textarea className="form-control" rows="3" value={form.description} onChange={e => handleChange('description', e.target.value)}></textarea>
            </div>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" checked={form.isFav} onChange={e => handleChange('isFav', e.target.checked)} /> 
                Pieza Favorita
              </label>
              <label>
                <input type="checkbox" checked={form.isWishlist} onChange={e => handleChange('isWishlist', e.target.checked)} /> 
                Buscando ejemplar (Lista de deseos)
              </label>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL APP ---
export default function App() {
  const [theme, setTheme] = useState(getFromLS('app_theme') || 'light');
  const [currentUser, setCurrentUser] = useState(null);
  const [usersDB, setUsersDB] = useState(getFromLS('app_users') || {});
  const [selectedColId, setSelectedColId] = useState(null);
  const [modalConfig, setModalConfig] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToLS('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    saveToLS('app_users', usersDB);
  }, [usersDB]);

  const handleLogin = (username, db) => {
    setCurrentUser(username);
    setUsersDB(db);
    const userCols = db[username].collections;
    if (userCols.length > 0) setSelectedColId(userCols[0].id);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedColId(null);
  };

  const getCurrentCollections = () => usersDB[currentUser]?.collections || [];
  
  const updateCollections = (newCollections) => {
    setUsersDB(prev => ({
      ...prev,
      [currentUser]: { ...prev[currentUser], collections: newCollections }
    }));
  };

  // --- LÓGICA CRUD COLECCIONES ---
  const openCollectionModal = (mode, collection = null) => {
    setModalConfig({
      type: 'collection',
      mode,
      data: collection || { id: Date.now(), name: '', items: [] },
      fields: []
    });
  };

  const saveCollection = (formData) => {
    let cols = getCurrentCollections();
    if (modalConfig.mode === 'create') {
      cols.push(formData);
      setSelectedColId(formData.id);
      showToast("Colección creada con éxito.");
    } else {
      cols = cols.map(c => c.id === formData.id ? { ...c, name: formData.name } : c);
      showToast("Colección actualizada.");
    }
    updateCollections(cols);
    setModalConfig(null);
  };

  const deleteCollection = (id) => {
    if (!window.confirm("¿Eliminar esta colección y todo su contenido?")) return;
    let cols = getCurrentCollections().filter(c => c.id !== id);
    updateCollections(cols);
    if (selectedColId === id) setSelectedColId(cols.length > 0 ? cols[0].id : null);
    showToast("Colección eliminada.");
  };

  // --- LÓGICA CRUD OBJETOS ---
  const getSelectedCollection = () => getCurrentCollections().find(c => c.id === selectedColId);

  const openItemModal = (mode, item = null) => {
    setModalConfig({
      type: 'item',
      mode,
      data: item || { id: Date.now(), name: '', description: '', isFav: false, isWishlist: false },
      fields: ['description']
    });
  };

  const saveItem = (formData) => {
    let cols = getCurrentCollections();
    cols = cols.map(col => {
      if (col.id === selectedColId) {
        if (modalConfig.mode === 'create') {
          col.items = [...col.items, formData];
          showToast("Pieza añadida a la colección.");
        } else {
          col.items = col.items.map(i => i.id === formData.id ? formData : i);
          showToast("Pieza actualizada.");
        }
      }
      return col;
    });
    updateCollections(cols);
    setModalConfig(null);
  };

  const deleteItem = (itemId) => {
    if (!window.confirm("¿Retirar esta pieza de la colección?")) return;
    let cols = getCurrentCollections().map(col => {
      if (col.id === selectedColId) {
        col.items = col.items.filter(i => i.id !== itemId);
      }
      return col;
    });
    updateCollections(cols);
    showToast("Pieza eliminada.");
  };

  // Variable faltante restaurada
  const selectedCollection = getSelectedCollection();

  // --- RENDERIZADO ---
  return (
    <>
      {!currentUser ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <div className="app-container">
          <header className="header">
            <h1>Ágora de Reliquias</h1>
            <div className="header-actions">
              <button className="btn-icon" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Cambiar Tema">
                {theme === 'light' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                )}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Abandonar Sala</button>
            </div>
          </header>

          <div className="main-content">
            <aside className="sidebar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Mis Colecciones</h2>
                <button className="btn btn-primary btn-sm" onClick={() => openCollectionModal('create')}>+ Nueva</button>
              </div>
              <ul className="collection-list">
                {getCurrentCollections().map(col => (
                  <li key={col.id} className={`collection-item ${selectedColId === col.id ? 'active' : ''}`} onClick={() => setSelectedColId(col.id)}>
                    <span>{sanitize(col.name)}</span>
                    <div className="collection-actions">
                      <button title="Editar" onClick={(e) => { e.stopPropagation(); openCollectionModal('edit', col); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button title="Borrar" onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>

            <main className="items-area">
              {selectedCollection ? (
                <>
                  <div className="items-header">
                    <h2 style={{ color: 'var(--accent)' }}>{sanitize(selectedCollection.name)}</h2>
                    <button className="btn btn-primary" onClick={() => openItemModal('create')}>+ Añadir Pieza</button>
                  </div>
                  
                  {selectedCollection.items.length === 0 ? (
                    <div className="empty-state">
                      <h2>Esta colección está vacía</h2>
                      <p>Comienza añadiendo tu primera pieza para dar vida a tu colección.</p>
                    </div>
                  ) : (
                    <div className="items-grid">
                      {selectedCollection.items.map(item => (
                        <div key={item.id} className="item-card">
                          <div className="item-card-content">
                            <h3>{sanitize(item.name)}</h3>
                            {item.description && <p>"{sanitize(item.description)}"</p>}
                            
                            <div className="badges">
                              {item.isFav && (
                                <span className="badge fav">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{marginRight: '4px', verticalAlign: 'middle'}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                  Favorita
                                </span>
                              )}
                              {item.isWishlist && (
                                <span className="badge wish">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px', verticalAlign: 'middle'}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                  Buscando
                                </span>
                              )}
                            </div>

                            <div className="card-actions">
                              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={() => openItemModal('edit', item)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Editar
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle'}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Retirar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <h2>Selecciona o crea una colección</h2>
                  <p>Utiliza el menú lateral para organizar tus diferentes colecciones.</p>
                </div>
              )}
            </main>
          </div>

          {modalConfig && (
            <CrudModal
              title={`${modalConfig.mode === 'create' ? 'Nueva' : 'Editar'} ${modalConfig.type === 'collection' ? 'Colección' : 'Pieza'}`}
              fields={modalConfig.fields}
              initialState={modalConfig.data}
              onClose={() => setModalConfig(null)}
              onSave={modalConfig.type === 'collection' ? saveCollection : saveItem}
            />
          )}
        </div>
      )}

      {/* Contenedor de notificaciones global */}
      <div id="toast-container" className="toast-container"></div>
    </>
  );
}