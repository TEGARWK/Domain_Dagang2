import React from 'react';
import CustomSelect from '../ui/CustomSelect';

const AddressFields = ({ formData, setFormData, addressHook, required = true }) => {
  const { provinces, cities, selectedProvinceId, selectedCityId, handleProvinceChange, handleCityChange } = addressHook;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="form-label">Provinsi</label>
        <div className="form-select-wrapper">
          <CustomSelect
            value={selectedProvinceId}
            onChange={val => handleProvinceChange({ target: { value: val } }, setFormData, formData)}
            placeholder={provinces.length ? "Pilih Provinsi" : "Memuat data..."}
            options={provinces.map(prov => ({ value: prov.id, label: prov.name }))}
            disabled={!provinces.length}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="form-label">Kota/Kabupaten</label>
        <div className="form-select-wrapper">
          <CustomSelect
            value={selectedCityId}
            onChange={val => handleCityChange({ target: { value: val } }, setFormData, formData)}
            placeholder="Pilih Kota"
            options={cities.map(city => ({ value: city.id, label: city.name }))}
            disabled={!selectedProvinceId || !cities.length}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="form-label">Kecamatan</label>
        <div className="form-select-wrapper">
          <CustomSelect
            value={addressHook.selectedDistrictId}
            onChange={val => addressHook.handleDistrictChange({ target: { value: val } }, setFormData, formData)}
            placeholder="Pilih Kecamatan"
            options={addressHook.districts.map(dst => ({ value: dst.id, label: dst.name }))}
            disabled={!selectedCityId || !addressHook.districts.length}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="form-label">Desa/Kelurahan</label>
        <div className="form-select-wrapper">
          <CustomSelect
            value={addressHook.selectedVillageId}
            onChange={val => addressHook.handleVillageChange({ target: { value: val } }, setFormData, formData)}
            placeholder="Pilih Desa"
            options={addressHook.villages.map(vil => ({ value: vil.id, label: vil.name }))}
            disabled={!addressHook.selectedDistrictId || !addressHook.villages.length}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="form-label">Kode Pos</label>
        <input type="text" name="zip_code" placeholder="Misal: 12345" value={formData.zip_code}
          onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="form-input" style={{ maxWidth: 200 }} required={required} maxLength={5} pattern="\d*" />
      </div>
      <div className="space-y-2">
        <label className="form-label">Alamat Lengkap</label>
        <textarea name="address_line1" rows="3" placeholder="Nama Jalan, Nomor Rumah, RT/RW, Kecamatan..."
          value={formData.address_line1} onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="form-input" style={{ resize: "none", lineHeight: 1.6 }} required={required} />
      </div>
    </div>
  );
};

export default AddressFields;
