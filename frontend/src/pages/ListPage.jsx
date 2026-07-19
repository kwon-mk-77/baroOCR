import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Search, Filter, ArrowLeft, Truck, Building, Hammer, Zap, Wrench, Package, Trash2 } from 'lucide-react';

const PROCESS_OPTIONS = [
  "토공사", "골조공사", "조적/미장공사", "전기/설비공사", "수장공사", "기타"
];

// Helper to assign a specific icon and color to each process
const getProcessIcon = (process) => {
  const configs = {
    "토공사": { icon: Truck, bg: "#E8F3FF", color: "#3182F6" }, 
    "골조공사": { icon: Building, bg: "#F3EEFF", color: "#6B36BA" }, 
    "조적/미장공사": { icon: Hammer, bg: "#FFF4E6", color: "#F08C00" }, 
    "전기/설비공사": { icon: Zap, bg: "#E3FAF3", color: "#0CA678" }, 
    "수장공사": { icon: Wrench, bg: "#FFE8EC", color: "#E03131" },
    "기타": { icon: Package, bg: "#F2F4F6", color: "#4E5968" }
  };
  return configs[process] || configs["기타"];
};

const ListPage = () => {
  const navigate = useNavigate();
  const [allReceipts, setAllReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalTarget, setDeleteModalTarget] = useState(null);
  
  // Filter states
  const [filterType, setFilterType] = useState('전체'); 
  const [filterProcess, setFilterProcess] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const url = `/api/receipts`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAllReceipts(data);
        applyFilters(data, filterType, filterProcess, filterItem, filterDateFrom, filterDateTo);
      }
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const applyFilters = (data, type, process, item, dateFrom, dateTo) => {
    let filtered = [...data];
    
    if (type === '공정별' && process) {
      filtered = filtered.filter(r => r.process === process);
    } 
    else if (type === '자재별' && item) {
      filtered = filtered.filter(r => r.item.toLowerCase().includes(item.toLowerCase()));
    }
    else if (type === '일자별' && (dateFrom || dateTo)) {
      filtered = filtered.filter(r => {
        if (!r.createdAt) return false;
        const itemDate = new Date(r.createdAt);
        itemDate.setHours(0,0,0,0);
        
        let match = true;
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0,0,0,0);
          if (itemDate < fromDate) match = false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(0,0,0,0);
          if (itemDate > toDate) match = false;
        }
        return match;
      });
    }
    
    setFilteredReceipts(filtered);
  };

  useEffect(() => {
    applyFilters(allReceipts, filterType, filterProcess, filterItem, filterDateFrom, filterDateTo);
  }, [allReceipts, filterType, filterProcess, filterItem, filterDateFrom, filterDateTo]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return `${date.getMonth()+1}월 ${date.getDate()}일`;
    } catch {
      return '';
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setDeleteModalTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteModalTarget) return;
    const id = deleteModalTarget;
    try {
      const response = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setAllReceipts(prev => prev.filter(r => r.id !== id));
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteModalTarget(null);
    }
  };

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* Header */}
      <div className="header" style={{ paddingBottom: 8 }}>
        <div className="flex items-center gap-4">
          <ArrowLeft className="header-icon" size={24} onClick={() => navigate('/menu')} />
          <h1 className="text-xl font-bold">인수증 내역</h1>
        </div>
        <button className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={fetchReceipts}>
          <Search size={20} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="filter-container">
        {['전체', '공정별', '자재별', '일자별'].map(opt => (
          <button
            key={opt}
            className={`filter-chip ${filterType === opt ? 'active' : ''}`}
            onClick={() => {
              setFilterType(opt);
              setFilterProcess('');
              setFilterItem('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Dynamic Filter Inputs */}
      <div style={{ padding: '0 20px', marginBottom: '16px' }}>
        {filterType === '공정별' && (
          <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            {PROCESS_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setFilterProcess(opt)}
                className={`filter-chip ${filterProcess === opt ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {filterType === '자재별' && (
          <input 
            type="text" 
            className="form-input" 
            placeholder="자재명 검색 (예: 철근)" 
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            style={{ padding: '12px 16px' }}
          />
        )}

        {filterType === '일자별' && (
          <div className="flex gap-2 items-center">
            <input 
              type="date" 
              className="form-input" 
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ padding: '12px' }}
            />
            <span className="text-secondary font-bold">~</span>
            <input 
              type="date" 
              className="form-input" 
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ padding: '12px' }}
            />
          </div>
        )}
      </div>

      {/* List Container */}
      <div className="card-container" style={{ paddingBottom: 100 }}>
        <div className="card" style={{ padding: '8px 24px' }}>
          {loading ? (
            <div className="text-center mt-6 mb-6 text-secondary font-semibold">내역을 불러오는 중...</div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center mt-6 mb-6 text-secondary font-semibold">
              내역이 없습니다.
            </div>
          ) : (
            filteredReceipts.map(receipt => {
              const { color } = getProcessIcon(receipt.process);
              return (
                <div 
                  key={receipt.id} 
                  className="list-item"
                  onClick={() => navigate(`/detail/${receipt.id}`)}
                >
                  <div className="flex items-center gap-4 w-full">
                    
                    {/* Content (2 lines) */}
                    <div style={{ flex: 1 }}>
                      <h3 className="font-bold text-lg" style={{ marginBottom: 2, color: color }}>{receipt.item}</h3>
                      <p className="text-black" style={{ fontSize: '0.85rem' }}>
                        {receipt.vendor || '알수없음'} · {formatDate(receipt.createdAt)}
                      </p>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl text-black">{receipt.quantity || '-'}</span>
                      <button 
                        style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}
                        onClick={(e) => handleDelete(receipt.id, e)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="fab" onClick={() => navigate('/camera')}>
        <Camera size={24} />
      </button>

      {/* Delete Confirmation Modal */}
      {deleteModalTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '24px', padding: '32px 24px',
            width: '100%', maxWidth: '340px', textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', 
              backgroundColor: '#FFF0F0', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Trash2 color="#E03131" size={32} />
            </div>
            <h2 className="font-bold text-xl mb-2 text-black">인수증 삭제</h2>
            <p className="text-secondary mb-8" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
              이 인수증을 정말 삭제하시겠습니까?<br/>삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '16px', borderRadius: '16px', fontSize: '1rem', fontWeight: 600, border: 'none', backgroundColor: '#F2F4F6', color: '#4E5968' }}
                onClick={() => setDeleteModalTarget(null)}
              >
                취소
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '16px', borderRadius: '16px', fontSize: '1rem', fontWeight: 600, backgroundColor: '#E03131', border: 'none' }}
                onClick={confirmDelete}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListPage;
