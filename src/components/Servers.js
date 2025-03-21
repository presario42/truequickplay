import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Servers.css';
import axios from 'axios';

// Update the API_URL to use your deployed backend in production
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://truequickplay-api.onrender.com/api' // Replace with your actual backend URL
  : 'http://localhost:5000/api';

// Game mode mapping based on map prefixes
const GAMEMODE_MAP = {
  'cp_': 'Control Points',
  'pl_': 'Payload',
  'plr_': 'Payload Race',
  'ctf_': 'Capture the Flag',
  'koth_': 'King of the Hill',
  'arena_': 'Arena',
  'mvm_': 'Mann vs Machine',
  'sd_': 'Special Delivery',
  'tc_': 'Territorial Control',
  'tr_': 'Training',
  'pd_': 'Player Destruction',
  'pass_': 'PASS Time',
  'rd_': 'Robot Destruction',
  'mge_': 'MGE',
  'jump_': 'Jump',
  'trade_': 'Trade',
  'achievement_': 'Achievement'
};

const Servers = () => {
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [regionFilters, setRegionFilters] = useState({});
  const [gamemodeFilters, setGamemodeFilters] = useState({});
  const [playerSort, setPlayerSort] = useState('desc'); // 'none', 'asc', 'desc'
  const [minPlayers, setMinPlayers] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(24);
  
  // Define applyFilters first to avoid the circular dependency
  const applyFilters = useCallback((serverList) => {
    const listToFilter = serverList || servers;
    let filtered = [...listToFilter];
    
    // Apply region filters
    filtered = filtered.filter(server => 
      regionFilters[server.region] === true
    );
    
    // Apply gamemode filters
    filtered = filtered.filter(server => {
      if (!server.map) return true;
      const mapPrefix = server.map.split('_')[0] + '_';
      const gamemode = GAMEMODE_MAP[mapPrefix] || 'Other';
      return gamemodeFilters[gamemode] === true;
    });
    
    // Apply player count filters
    filtered = filtered.filter(server => {
      const playerCount = parseInt(server.players.split('/')[0]);
      return playerCount >= minPlayers && playerCount <= maxPlayers;
    });
    
    // Apply player count sorting
    if (playerSort !== 'none') {
      filtered.sort((a, b) => {
        const aPlayers = parseInt(a.players.split('/')[0]);
        const bPlayers = parseInt(b.players.split('/')[0]);
        
        return playerSort === 'asc' ? aPlayers - bPlayers : bPlayers - aPlayers;
      });
    }
    
    setFilteredServers(filtered);
  }, [servers, regionFilters, gamemodeFilters, minPlayers, maxPlayers, playerSort]);
  
  // Now define fetchServers after applyFilters
  const fetchServers = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Add the refresh parameter to the request
      const url = forceRefresh 
        ? `${API_URL}/servers?refresh=true` 
        : `${API_URL}/servers`;
        
      const response = await axios.get(url);
      const serverData = response.data.servers;
      
      // Extract all unique regions and gamemodes for filter options
      const regions = {};
      const gamemodes = {};
      
      serverData.forEach(server => {
        // Add region to filter options
        if (server.region) {
          regions[server.region] = true;
        }
        
        // Determine gamemode from map prefix
        if (server.map) {
          const mapPrefix = server.map.split('_')[0] + '_';
          const gamemode = GAMEMODE_MAP[mapPrefix] || 'Other';
          gamemodes[gamemode] = true;
        }
      });
      
      // Initialize filters if empty
      if (Object.keys(regionFilters).length === 0) {
        setRegionFilters(regions);
      }
      
      if (Object.keys(gamemodeFilters).length === 0) {
        setGamemodeFilters(gamemodes);
      }
      
      // Log if we're getting data from cache
      if (response.data.fromCache) {
        console.log(`Using cached server data (age: ${response.data.cacheAge})`);
      }
      
      setServers(serverData);
      applyFilters(serverData);
      setLoading(false);
    } catch (err) {
      console.error('Error al buscar servidores:', err);
      setError('No se pudieron cargar los servidores. Intente de nuevo mas tarde.');
      setLoading(false);
    }
  }, [regionFilters, gamemodeFilters, applyFilters]);
  
  // Toggle a specific region filter
  const toggleRegionFilter = (region) => {
    setRegionFilters(prev => ({
      ...prev,
      [region]: !prev[region]
    }));
  };
  
  // Toggle a specific gamemode filter
  const toggleGamemodeFilter = (gamemode) => {
    setGamemodeFilters(prev => ({
      ...prev,
      [gamemode]: !prev[gamemode]
    }));
  };
  
  // Reset all filters to default
  const resetFilters = () => {
    const allRegions = {};
    const allGamemodes = {};
    
    servers.forEach(server => {
      if (server.region) {
        allRegions[server.region] = true;
      }
      
      if (server.map) {
        const mapPrefix = server.map.split('_')[0] + '_';
        const gamemode = GAMEMODE_MAP[mapPrefix] || 'Other';
        allGamemodes[gamemode] = true;
      }
    });
    
    setRegionFilters(allRegions);
    setGamemodeFilters(allGamemodes);
    setPlayerSort('none');
    setMinPlayers(0);
    setMaxPlayers(32);
  };
  
  // Apply filters when filter states change
  useEffect(() => {
    if (!loading && servers.length > 0) {
      applyFilters();
    }
  }, [regionFilters, gamemodeFilters, playerSort, minPlayers, maxPlayers, applyFilters, loading, servers.length]);
  
  // This should only run once when the component mounts
  useEffect(() => {
    fetchServers(false);
    // Don't include fetchServers in the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Wrap functions in useCallback to prevent infinite loops
  const handleJoinServer = useCallback((serverAddress) => {
    try {
      // Try the TF2-specific format
      const tfUrl = `steam://run/440//+connect ${serverAddress}`;
      console.log('Joining server with URL:', tfUrl);
      
      // Navigate directly to the server
      window.location.href = tfUrl;
      
      // Show a helpful message to the user
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          console.log('La conexión puede estar teniendo problemas');
          alert('Si el juego no inició automaticamente, copia el IP del servidor y conéctate manualmente en la consola: connect ' + serverAddress);
        }
      }, 3000);
    } catch (err) {
      console.error('Error al unirse al servidor:', err);
      alert('No se pudo unir al servidor. Intente de nuevo o conéctate manualmente en la consola: connect ' + serverAddress);
    }
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('IP del servidor copiado al portapapeles! Puedes pegarla en la consola con el comando "connect".');
      })
      .catch(err => {
        console.error('No se pudo copiar: ', err);
        alert('Por favor copie manualmente: ' + text);
      });
  };
  
  return (
    <div className="servers-container">
      <div className="servers-header">
        <h1>TrueQuickplay Servers</h1>
        <p>Find and join servers running with the "truequickplay" tag</p>
        <div className="server-controls">
          <button className="refresh-button" onClick={() => fetchServers(true)} disabled={loading}>
            {loading ? 'Refrescando...' : 'Refrescar la lista'}
          </button>
          <button className="filter-toggle-button" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="filters-container">
          <div className="filter-section">
            <h3>Regions</h3>
            <div className="filter-options">
              {Object.keys(regionFilters).map(region => (
                <label key={region} className="filter-option">
                  <input
                    type="checkbox"
                    checked={regionFilters[region]}
                    onChange={() => toggleRegionFilter(region)}
                  />
                  {region}
                </label>
              ))}
            </div>
          </div>
          
          <div className="filter-section">
            <h3>Gamemodes</h3>
            <div className="filter-options">
              {Object.keys(gamemodeFilters).map(gamemode => (
                <label key={gamemode} className="filter-option">
                  <input
                    type="checkbox"
                    checked={gamemodeFilters[gamemode]}
                    onChange={() => toggleGamemodeFilter(gamemode)}
                  />
                  {gamemode}
                </label>
              ))}
            </div>
          </div>
          
          <div className="filter-section">
            <h3>Player Count</h3>
            <div className="player-sort">
              <label>
                <input
                  type="radio"
                  name="playerSort"
                  checked={playerSort === 'none'}
                  onChange={() => setPlayerSort('none')}
                />
                No Sorting
              </label>
              <label>
                <input
                  type="radio"
                  name="playerSort"
                  checked={playerSort === 'asc'}
                  onChange={() => setPlayerSort('asc')}
                />
                Least Players First
              </label>
              <label>
                <input
                  type="radio"
                  name="playerSort"
                  checked={playerSort === 'desc'}
                  onChange={() => setPlayerSort('desc')}
                />
                Most Players First
              </label>
            </div>
            
            <div className="player-range">
              <label>
                Min Players:
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(parseInt(e.target.value))}
                />
              </label>
              <label>
                Max Players:
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                />
              </label>
            </div>
          </div>
          
          <button className="reset-filters-button" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      )}
      
      <div className="servers-list-container">
        {loading ? (
          <div className="loading-message">
            <h2>Cargando servidores</h2>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="error-message">
            <h3>{error}</h3>
            <button className="retry-button" onClick={fetchServers}>Reintentar</button>
          </div>
        ) : filteredServers.length > 0 ? (
          <div className="servers-table-container">
            <table className="servers-table">
              <thead>
                <tr>
                  <th>Nombre del Servidor</th>
                  <th>Mapa</th>
                  <th>Jugadores</th>
                  <th>Región</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredServers.map(server => (
                  <tr key={server.id}>
                    <td>{server.name}</td>
                    <td>{server.map}</td>
                    <td>{server.players}</td>
                    <td>{server.region}</td>
                    <td>
                      <button 
                        className="join-button" 
                        onClick={() => handleJoinServer(server.address)}
                      >
                        Join
                      </button>
                      <button 
                        className="copy-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(server.address);
                        }}
                      >
                        Copy IP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-servers">
            <h3>No hay servidores que coincidan con los filtros</h3>
            <button className="reset-filters-button" onClick={resetFilters}>Reset Filters</button>
          </div>
        )}
      </div>
      
      <div className="create-server-section">
        <h2>Crear tu propio servidor</h2>
        <div className="server-instructions">
          <div className="instruction-step">
            <h3>Step 1</h3>
            <p>Crea un servidor con cualquier mapa que quieras. Asegúrate de que el boton Steam Networking esté habilitado.</p>
          </div>
          
          <div className="instruction-step">
            <h3>Step 2</h3>
            <p>Escribe "sv_tags" en la consola, seguido de "truequickplay". Esto es OBLIGATORIO para poder participar en el movimiento.</p>
          </div>
          
          <div className="instruction-step">
            <h3>Step 3</h3>
            <p>Espera a que la gente se una, o comparte la IP en el servidor de Discord con el ping respectivo.</p>
          </div>
          
          <div className="instruction-step">
            <h3>Step 4</h3>
            <p>Diviertete jugando TF2 como realmente se supone que se juege!</p>
          </div>
        </div>
        
        <div className="join-discord">
          <a href="https://discord.gg/pnBbJg2tZf" target="_blank" rel="noopener noreferrer" className="discord-button">
          Únete al Discord
          </a>
        </div>
      </div>
    </div>
  );
};

export default Servers;
