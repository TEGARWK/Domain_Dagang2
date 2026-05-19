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
    <div className="space-y-4">
      {/* ROW: PROVINSI */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Provinsi</label>
        <div className="w-full bg-slate-50/30 border border-slate-200 rounded-lg focus-within:ring-4 focus-within:ring-orange-50 focus-within:border-orange-500 transition-all font-medium text-slate-800 shadow-sm">
            <CustomSelect 
                value={selectedProvinceId}
                onChange={val => handleProvinceChange({ target: { value: val } }, setFormData, formData)}
                placeholder={provinces.length ? "Pilih Provinsi" : "Memuat data..."}
                options={provinces.map(prov => ({ value: prov.id, label: prov.name }))}
                disabled={!provinces.length}
            />
        </div>
      </div>

      {/* ROW: KOTA */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Kota/Kabupaten</label>
        <div className="w-full bg-slate-50/30 border border-slate-200 rounded-lg focus-within:ring-4 focus-within:ring-orange-50 focus-within:border-orange-500 transition-all font-medium text-slate-800 shadow-sm">
            <CustomSelect 
                value={selectedCityId}
                onChange={val => handleCityChange({ target: { value: val } }, setFormData, formData)}
                placeholder="Pilih Kota"
                options={cities.map(city => ({ value: city.id, label: city.name }))}
                disabled={!selectedProvinceId || !cities.length}
            />
        </div>
      </div>

      {/* ROW: KECAMATAN */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Kecamatan</label>
        <div className="w-full bg-slate-50/30 border border-slate-200 rounded-lg focus-within:ring-4 focus-within:ring-orange-50 focus-within:border-orange-500 transition-all font-medium text-slate-800 shadow-sm">
            <CustomSelect 
                value={addressHook.selectedDistrictId}
                onChange={val => addressHook.handleDistrictChange({ target: { value: val } }, setFormData, formData)}
                placeholder="Pilih Kecamatan"
                options={addressHook.districts.map(dst => ({ value: dst.id, label: dst.name }))}
                disabled={!selectedCityId || !addressHook.districts.length}
            />
        </div>
      </div>

      {/* ROW: DESA/KELURAHAN */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Desa/Kelurahan</label>
        <div className="w-full bg-slate-50/30 border border-slate-200 rounded-lg focus-within:ring-4 focus-within:ring-orange-50 focus-within:border-orange-500 transition-all font-medium text-slate-800 shadow-sm">
            <CustomSelect 
                value={addressHook.selectedVillageId}
                onChange={val => addressHook.handleVillageChange({ target: { value: val } }, setFormData, formData)}
                placeholder="Pilih Desa"
                options={addressHook.villages.map(vil => ({ value: vil.id, label: vil.name }))}
                disabled={!addressHook.selectedDistrictId || !addressHook.villages.length}
            />
        </div>
      </div>

      {/* ROW: KODE POS */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Kode Pos</label>
        <input
          type="text"
          name="zip_code"
          placeholder="Misal: 12345"
          value={formData.zip_code}
          onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="w-full max-w-[200px] bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-2 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 shadow-sm"
          required={required}
          maxLength={5}
          pattern="\d*"
        />
      </div>

      {/* ROW: ALAMAT LENGKAP */}
      <div className="space-y-2.5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Alamat Lengkap</label>
        <textarea
          name="address_line1"
          rows="3"
          placeholder="Nama Jalan, Nomor Rumah, RT/RW, Kecamatan..."
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-5 py-2 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 resize-none leading-relaxed shadow-sm shadow-inner"
          required={required}
        ></textarea>
      </div>
    </div>
  );
};

export default AddressFields;
