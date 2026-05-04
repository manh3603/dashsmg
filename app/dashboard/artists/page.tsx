"use client";

import { BadgeCheck, ExternalLink } from "lucide-react";

const artists = [
  { name: "Artist chính", role: "Bạn", verified: true, platforms: ["Spotify for Artists", "Apple Music for Artists"] },
  { name: "Feat. MC Blue", role: "Nghệ sĩ khách", verified: false, platforms: [] },
];

export default function ArtistsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý nghệ sĩ</h1>
        <p className="mt-1 text-slate-600">
          Dành cho nhãn đĩa: nhiều profile — hỗ trợ quy trình xác minh tích xanh trên các nền tảng
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nghệ sĩ</th>
              <th className="px-4 py-3 font-medium">Vai trò</th>
              <th className="px-4 py-3 font-medium">Xác thực</th>
              <th className="px-4 py-3 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {artists.map((a) => (
              <tr key={a.name} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.role}</td>
                <td className="px-4 py-3">
                  {a.verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <BadgeCheck className="h-4 w-4" /> Đã xác minh
                    </span>
                  ) : (
                    <span className="text-amber-700">Chưa xác minh</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a
                    href="https://artists.spotify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-violet-600 hover:underline"
                  >
                    Spotify for Artists
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
