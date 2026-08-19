import React from "react";
import { motion } from "framer-motion";

function ActionCard({ icon, title, description, buttonText, onClick, gradient, delay }) {
  const gradientClasses = {
    blue: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
    indigo: "from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
    purple: "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
  };

  const iconGradients = {
    blue: "from-blue-500 to-blue-600",
    indigo: "from-indigo-500 to-indigo-600",
    purple: "from-purple-500 to-purple-600"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -5 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg shadow-xl dark:shadow-black/20 border border-gray-100 dark:border-gray-700 p-8 hover:shadow-2xl transition-all duration-300"
    >
      <div className={`w-14 h-14 bg-gradient-to-br ${iconGradients[gradient]} rounded-lg flex items-center justify-center mb-6 shadow-lg`}>
        {icon}
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        {description}
      </p>

      <button
        onClick={onClick}
        className={`w-full bg-gradient-to-r ${gradientClasses[gradient]} text-white py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {buttonText}
      </button>
    </motion.div>
  );
}

export default ActionCard;
