import { useState, useEffect } from 'react';

const useAddress = (initialStateName = "", initialCityName = "") => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  
  // Track if we are in "initial load" mode to handle pre-filling
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper: Title Case
  const toTitleCase = (str) => {
    if (!str) return "";
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  // 1. Fetch Provinces on Mount
  useEffect(() => {
    fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json")
      .then((res) => res.json())
      .then((data) => {
        setProvinces(data);
      })
      .catch((err) => console.error("Gagal ambil provinsi:", err));
  }, []);

  // 2. Sync Initial State (e.g. from async profile load)
  useEffect(() => {
    if (provinces.length > 0 && initialStateName && !selectedProvinceId) {
        const foundProv = provinces.find(p => 
            p.name.toLowerCase() === initialStateName.toLowerCase() || 
            toTitleCase(p.name) === initialStateName
        );
        if (foundProv) {
            setSelectedProvinceId(foundProv.id);
        }
    }
  }, [provinces, initialStateName]);

  // 3. Fetch Cities when Province Changes
  useEffect(() => {
    if (!selectedProvinceId) {
        setCities([]);
        return;
    }

    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvinceId}.json`)
      .then((res) => res.json())
      .then((data) => {
        setCities(data);
        
        // Handle Initial City Pre-fill (Only if we just set the province matching initial state)
        if (initialCityName && !selectedCityId) {
             const foundCity = data.find(c => 
                c.name.toLowerCase() === initialCityName.toLowerCase() ||
                toTitleCase(c.name) === initialCityName
            );
            if (foundCity) {
                setSelectedCityId(foundCity.id);
            }
        }
      })
      .catch((err) => console.error("Gagal ambil kota:", err));
  }, [selectedProvinceId]); // Removed initialCityName from dependency to avoid loop, but might need checking


  const handleProvinceChange = (e, setFormData, formData) => {
    const provinceId = e.target.value;
    const provinceObj = provinces.find(p => p.id === provinceId);
    const provinceName = provinceObj ? provinceObj.name : "";

    setSelectedProvinceId(provinceId);
    setSelectedCityId(""); // Reset city selection
    setCities([]); // Clear cities temporarily

    // Update parent form data
    setFormData({ 
        ...formData, 
        state: toTitleCase(provinceName), 
        city: "" 
    });
  };

  const handleCityChange = (e, setFormData, formData) => {
    const cityId = e.target.value;
    const cityObj = cities.find(c => c.id === cityId);
    const cityName = cityObj ? cityObj.name : "";
    
    setSelectedCityId(cityId);
    
    // Update parent form data
    setFormData({ 
        ...formData, 
        city: toTitleCase(cityName) 
    });
  };

  return {
    provinces,
    cities,
    selectedProvinceId,
    selectedCityId,
    handleProvinceChange,
    handleCityChange
  };
};

export default useAddress;
