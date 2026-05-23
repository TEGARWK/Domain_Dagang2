import { useState, useEffect } from 'react';
import api from '../services/api';

const useAddress = (
  initialStateName = "", 
  initialCityName = "", 
  initialDistrictName = "", 
  initialVillageName = ""
) => {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");

  const [isLoading, setIsLoading] = useState({
    prov: false, city: false, dist: false, vill: false
  });

  // Helper: Title Case
  const toTitleCase = (str) => {
    if (!str) return "";
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  const fetchRegions = async (endpoint, setter, loadingKey) => {
    setIsLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const res = await api.get(endpoint);
      setter(res.data || []);
      return res.data;
    } catch (err) {
      console.error(`Gagal ambil data ${loadingKey}:`, err);
      setter([]);
      return [];
    } finally {
      setIsLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // 1. Fetch Provinces on Mount
  useEffect(() => {
    fetchRegions('/regions/provinces', setProvinces, 'prov');
  }, []);

  // 2. Sync Initial State
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
        setDistricts([]);
        setVillages([]);
        return;
    }
    fetchRegions(`/regions/children/${selectedProvinceId}`, (data) => {
        setCities(data);
        if (initialCityName && !selectedCityId) {
             const found = data.find(c => 
                c.name.toLowerCase() === initialCityName.toLowerCase() ||
                toTitleCase(c.name) === initialCityName
            );
            if (found) setSelectedCityId(found.id);
        }
    }, 'city');
  }, [selectedProvinceId]);

  // 4. Fetch Districts when City Changes
  useEffect(() => {
    if (!selectedCityId) {
        setDistricts([]);
        setVillages([]);
        return;
    }
    fetchRegions(`/regions/children/${selectedCityId}`, (data) => {
        setDistricts(data);
        if (initialDistrictName && !selectedDistrictId) {
             const found = data.find(c => 
                c.name.toLowerCase() === initialDistrictName.toLowerCase() ||
                toTitleCase(c.name) === initialDistrictName
            );
            if (found) setSelectedDistrictId(found.id);
        }
    }, 'dist');
  }, [selectedCityId]);

  // 5. Fetch Villages when District Changes
  useEffect(() => {
    if (!selectedDistrictId) {
        setVillages([]);
        return;
    }
    fetchRegions(`/regions/children/${selectedDistrictId}`, (data) => {
        setVillages(data);
        if (initialVillageName && !selectedVillageId) {
             const found = data.find(c => 
                c.name.toLowerCase() === initialVillageName.toLowerCase() ||
                toTitleCase(c.name) === initialVillageName
            );
            if (found) setSelectedVillageId(found.id);
        }
    }, 'vill');
  }, [selectedDistrictId]);


  // Handlers
  const handleProvinceChange = (e, setFormData, formData) => {
    const id = e.target.value;
    setSelectedProvinceId(id);
    setSelectedCityId("");
    setSelectedDistrictId("");
    setSelectedVillageId("");
    
    const obj = provinces.find(p => p.id === id);
    setFormData({ 
        ...formData, 
        state: obj ? toTitleCase(obj.name) : "", 
        city: "", district: "", village: "" 
    });
  };

  const handleCityChange = (e, setFormData, formData) => {
    const id = e.target.value;
    setSelectedCityId(id);
    setSelectedDistrictId("");
    setSelectedVillageId("");
    
    const obj = cities.find(c => c.id === id);
    setFormData({ 
        ...formData, 
        city: obj ? toTitleCase(obj.name) : "",
        district: "", village: ""
    });
  };

  const handleDistrictChange = (e, setFormData, formData) => {
    const id = e.target.value;
    setSelectedDistrictId(id);
    setSelectedVillageId("");
    
    const obj = districts.find(c => c.id === id);
    setFormData({ 
        ...formData, 
        district: obj ? toTitleCase(obj.name) : "",
        village: ""
    });
  };

  const handleVillageChange = (e, setFormData, formData) => {
    const id = e.target.value;
    setSelectedVillageId(id);
    
    const obj = villages.find(c => c.id === id);
    setFormData({ 
        ...formData, 
        village: obj ? toTitleCase(obj.name) : ""
    });
  };

  return {
    provinces, cities, districts, villages,
    selectedProvinceId, selectedCityId, selectedDistrictId, selectedVillageId,
    isLoading,
    handleProvinceChange, handleCityChange, handleDistrictChange, handleVillageChange
  };
};

export default useAddress;
