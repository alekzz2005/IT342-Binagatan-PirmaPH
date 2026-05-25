package com.pirmaph.mobile.ui.resident.dashboard

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.pirmaph.mobile.R

class AnnouncementsAdapter : RecyclerView.Adapter<AnnouncementsAdapter.ViewHolder>() {

    private val announcements = mutableListOf<AnnouncementItem>()

    fun submitList(newAnnouncements: List<AnnouncementItem>) {
        announcements.clear()
        announcements.addAll(newAnnouncements)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_announcement, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(announcements[position])
    }

    override fun getItemCount(): Int = announcements.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvAnnouncementBadge: TextView = itemView.findViewById(R.id.tvAnnouncementBadge)
        private val tvAnnouncementTitle: TextView = itemView.findViewById(R.id.tvAnnouncementTitle)
        private val tvAnnouncementBody: TextView = itemView.findViewById(R.id.tvAnnouncementBody)
        private val tvAnnouncementDate: TextView = itemView.findViewById(R.id.tvAnnouncementDate)

        fun bind(item: AnnouncementItem) {
            tvAnnouncementBadge.text = item.badgeLabel
            tvAnnouncementBadge.backgroundTintList = ColorStateList.valueOf(Color.parseColor(item.badgeColorHex))
            tvAnnouncementTitle.text = item.title
            tvAnnouncementBody.text = item.body
            tvAnnouncementDate.text = item.dateStr
        }
    }
}
