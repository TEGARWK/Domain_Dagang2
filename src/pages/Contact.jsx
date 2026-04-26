import React from "react";
import { Link } from "react-router-dom";

const Contact = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <div className="mb-16">
          <span className="text-[#F97316] font-bold text-[10px] uppercase tracking-[0.25em] mb-3 block">Get in touch</span>
          <h1 className="text-[36px] lg:text-[44px] font-bold text-slate-900 tracking-tight leading-[1.1] mb-4">
            Ada yang bisa kami <br />
            <span className="text-slate-400">bantu untuk Anda?</span>
          </h1>
        </div>

        {/* MAIN CONTENT: SPLIT LAYOUT */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT: CONTACT INFO (5 COLUMNS) */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* WhatsApp Item */}
            <a href="https://wa.me/6281222429289" target="_blank" rel="noopener noreferrer" className="group flex items-start gap-5 p-3 -ml-3 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.161 1.237 8.404 3.48s3.484 5.229 3.484 8.408c0 6.556-5.332 11.888-11.888 11.888-2.003 0-3.963-.505-5.7-1.467l-6.305 1.656zm6.303-4.71c1.667.98 3.323 1.499 5.289 1.499 5.201 0 9.435-4.234 9.435-9.435 0-2.52-0.982-4.888-2.766-6.672-1.784-1.784-4.152-2.766-6.672-2.766-5.201 0-9.435 4.234-9.435 9.435 0 2.093.569 3.863 1.652 5.534l-1.005 3.673 3.772-.991zm10.302-6.903c-.279-.14-1.647-.812-1.903-.905-.256-.092-.441-.139-.627.139-.186.279-.719.905-.881 1.091-.162.186-.325.21-.604.07-.279-.14-1.18-.435-2.247-1.387-.83-.741-1.39-1.654-1.553-1.934-.163-.28-.018-.431.122-.57.126-.125.279-.325.418-.488.14-.163.186-.279.279-.465.093-.186.047-.349-.023-.488-.07-.14-.627-1.511-.859-2.07-.226-.547-.454-.472-.627-.48l-.534-.006c-.186 0-.488.07-.743.349-.256.279-.976.953-.976 2.325s1.001 2.697 1.14 2.883c.14.186 1.968 3.005 4.767 4.213.665.287 1.185.459 1.589.587.669.213 1.278.183 1.758.112.536-.08 1.647-.674 1.879-1.325.233-.651.233-1.209.163-1.325-.07-.116-.256-.186-.535-.326z"/></svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-0.5">WhatsApp Support</h4>
                <p className="text-slate-500 text-[13px] font-medium mb-2">Respon cepat via chat WhatsApp resmi kami.</p>
                <span className="text-base font-bold text-slate-800 block mb-1.5">0812 2242 9289</span>
                <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">Mulai Chat <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></span>
              </div>
            </a>

            {/* Email Item */}
            <a href="mailto:admin@aplikasidagang.co.id" className="group flex items-start gap-5 p-3 -ml-3 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-0.5">Email Official</h4>
                <p className="text-slate-500 text-[13px] font-medium mb-2">Untuk kerjasama dan pertanyaan teknis lainnya.</p>
                <span className="text-base font-bold text-slate-800 block mb-1.5">admin@aplikasidagang.co.id</span>
                <span className="text-blue-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">Kirim Email <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></span>
              </div>
            </a>

            {/* Address Item */}
            <div className="group flex items-start gap-6 p-4 -ml-4 rounded-3xl">
              <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">Kantor Kami</h4>
                <p className="text-slate-500 font-medium mb-3">Silakan mampir ke workshop kami.</p>
                <span className="text-slate-800 font-bold leading-relaxed block">
                  Jl. Cigadung Raya Tengah No.52, Cigadung, <br />
                  Kec. Cibeunying Kaler, Kota Bandung, <br />
                  Jawa Barat 40191.
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT: MAP (7 COLUMNS) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl overflow-hidden shadow-lg h-[600px] border border-slate-100">
               <iframe 
                src="https://maps.google.com/maps?q=Aplikasi%20Dagang%20-%20Jasa%20Pembuatan%20Website%20Bandung&t=&z=17&ie=UTF8&iwloc=&output=embed" 
                className="w-full h-full border-0" 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location"
              ></iframe>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Contact;
