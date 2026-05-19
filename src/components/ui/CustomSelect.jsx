import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Pilih...", 
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  // Close dropdown when clicking outside (global listener for portal)
  useEffect(() => {
    function handleClickOutside(event) {
      if (triggerRef.current && !triggerRef.current.contains(event.target)) {
        // Cek jika click di dalam portal content
        const portal = document.getElementById("custom-select-portal");
        if (portal && !portal.contains(event.target)) {
             setIsOpen(false);
        }
      }
    }
    
    // Close on resize/scroll to avoid misplaced dropdowns
    function handleScrollResize(e) {
        // Fix: Jangan close jika user scroll di dalam dropdown itu sendiri
        const portal = document.getElementById("custom-select-portal");
        if (e.type === 'scroll' && portal && portal.contains(e.target)) {
            return;
        }
        if(isOpen) setIsOpen(false);
    }

    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScrollResize, true);
        window.addEventListener("resize", handleScrollResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen) {
        // Calculate position before opening
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + window.scrollY + 4, // +4px margin
            left: rect.left + window.scrollX,
            width: rect.width
        });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  // Find label for current value
  const selectedLabel = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === value
  );

  const displayLabel = selectedLabel 
    ? (typeof selectedLabel === 'object' ? selectedLabel.label : selectedLabel) 
    : placeholder;

  return (
    <>
        {/* Trigger Button */}
        <div 
          ref={triggerRef}
          onClick={toggleDropdown}
          className={`
            relative w-full px-4 py-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all select-none ${className}
            ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white hover:border-[#F97316]'}
            ${isOpen ? 'border-[#F97316] ring-2 ring-[#F97316]/20' : 'border-slate-200'}
          `}
        >
          <span className={`text-xs font-bold truncate pr-2 ${!selectedLabel ? 'text-slate-400' : 'text-slate-700'}`}>
            {displayLabel}
          </span>
          <svg 
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#F97316]' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown Options via Portal */}
        {isOpen && ReactDOM.createPortal(
            <div 
            id="custom-select-portal"
            className="absolute z-[9999] bg-white border border-slate-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-100 origin-top"
            style={{
                top: coords.top,
                left: coords.left,
                minWidth: coords.width,
                maxWidth: 'calc(100vw - 40px)'
            }}
          >
            <ul className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
              {options.map((option, idx) => {
                const optValue = typeof option === 'object' ? option.value : option;
                const optLabel = typeof option === 'object' ? option.label : option;
                const isSelected = optValue === value;

                return (
                  <li 
                    key={idx}
                    onClick={() => handleSelect(optValue)}
                    className={`
                      px-4 py-3 text-xs font-bold cursor-pointer transition-all flex items-center justify-between mx-2 rounded-lg mb-0.5 last:mb-0
                      ${isSelected 
                        ? 'bg-orange-50 text-[#F97316]' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                  >
                    <span className="flex-1 mr-2">{optLabel}</span>
                    {isSelected && (
                      <div className="w-5 h-5 bg-orange-100/50 rounded-lg flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-[#F97316] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </li>
                );
              })}
              {options.length === 0 && (
                 <li className="px-4 py-6 text-xs text-slate-400 italic text-center">Nggak ada pilihan nih...</li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
};

export default CustomSelect;
