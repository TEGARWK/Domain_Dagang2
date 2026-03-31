import React from 'react';
import CustomSelect from '../ui/CustomSelect';

const AddressFields = ({ formData, setFormData, addressHook, required = true }) => {
  const {
    provinces,
    cities,
    selectedProvinceId,
    selectedCityId,
    handleProvinceChange,
    handleCityChange
  } = addressHook;

  return (
    <>
      {/* ROW: PROVINSI */}
      <div className="grid grid-cols-[120px_1fr] items-center gap-6">
        <label className="text-sm text-slate-500 text-right">Provinsi</label>
        <div className="w-full bg-white border border-slate-300 rounded focus-within:border-slate-500 transition-all">
            <CustomSelect 
                value={selectedProvinceId}
                onChange={val => handleProvinceChange({ target: { value: val } }, setFormData, formData)}
                placeholder={provinces.length ? "Pilih Provinsi" : "Memuat..."}
                options={provinces.map(prov => ({ value: prov.id, label: prov.name }))}
                disabled={!provinces.length}
            />
        </div>
      </div>

      {/* ROW: KOTA */}
      <div className="grid grid-cols-[120px_1fr] items-center gap-6">
        <label className="text-sm text-slate-500 text-right">Kota/Kabupaten</label>
        <div className="w-full bg-white border border-slate-300 rounded focus-within:border-slate-500 transition-all">
            <CustomSelect 
                value={selectedCityId}
                onChange={val => handleCityChange({ target: { value: val } }, setFormData, formData)}
                placeholder="Pilih Kota"
                options={cities.map(city => ({ value: city.id, label: city.name }))}
                disabled={!selectedProvinceId || !cities.length}
            />
        </div>
      </div>

      {/* ROW: KODE POS */}
      <div className="grid grid-cols-[120px_1fr] items-center gap-6">
        <label className="text-sm text-slate-500 text-right">Kode Pos</label>
        <input
          type="text"
          name="zip_code"
          placeholder="Misal: 12345"
          value={formData.zip_code}
          onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all"
          required={required}
          maxLength={5}
          pattern="\d*"
        />
      </div>

      {/* ROW: ALAMAT LENGKAP */}
      <div className="grid grid-cols-[120px_1fr] items-start gap-6 mt-4">
        <label className="text-sm text-slate-500 text-right pt-2">Alamat Lengkap</label>
        <textarea
          name="address_line1"
          rows="3"
          placeholder="Nama Jalan, Nomor Rumah, RT/RW, Kecamatan..."
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all resize-none"
          required={required}
        ></textarea>
      </div>
    </>
  );
};

export default AddressFields;
