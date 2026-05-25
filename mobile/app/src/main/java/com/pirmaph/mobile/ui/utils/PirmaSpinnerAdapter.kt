package com.pirmaph.mobile.ui.utils

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.TextView
import com.pirmaph.mobile.R

class PirmaSpinnerAdapter(
    context: Context,
    items: List<String>
) : ArrayAdapter<String>(context, R.layout.spinner_item, items) {

    init {
        setDropDownViewResource(R.layout.spinner_dropdown_item)
    }

    override fun isEnabled(position: Int): Boolean {
        // Disable the first item from being selected in the dropdown
        return position != 0
    }

    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = super.getView(position, convertView, parent) as TextView
        if (position == 0) {
            // Set placeholder color
            view.setTextColor(context.resources.getColor(R.color.pirma_placeholder, null))
        } else {
            // Set normal text color
            view.setTextColor(context.resources.getColor(R.color.pirma_text_dark, null))
        }
        return view
    }

    override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = super.getDropDownView(position, convertView, parent) as TextView
        if (position == 0) {
            // Set placeholder color in dropdown
            view.setTextColor(context.resources.getColor(R.color.pirma_placeholder, null))
        } else {
            // Set normal text color in dropdown
            view.setTextColor(context.resources.getColor(R.color.pirma_text_dark, null))
        }
        return view
    }
}
