from typing import Any

import pandas as pd

from sklearn.metrics import (
    silhouette_samples,
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score
)

from app.services.model_service import (
    model_service
)


class RFMService:

    FEATURE_COLUMNS = [
        "Recency",
        "Frequency",
        "Monetary"
    ]


    def analyze(
        self,
        transactions: list[dict[str, Any]],
        reference_date
    ) -> dict[str, Any]:

        if not transactions:
            raise ValueError(
                "Data transaksi tidak boleh kosong."
            )

        # Convert to DataFrame
        df = pd.DataFrame(
            transactions
        )


        required_columns = {
            "transaction_id",
            "customer_id",
            "transaction_date",
            "total_amount"
        }


        missing_columns = (
            required_columns
            - set(df.columns)
        )


        if missing_columns:

            raise ValueError(
                "Kolom transaksi tidak lengkap: "
                + ", ".join(
                    sorted(
                        missing_columns
                    )
                )
            )


        # Remove accidental duplicate transaction
        df = (
            df
            .drop_duplicates(
                subset=[
                    "transaction_id"
                ]
            )
            .copy()
        )

        # Parse types
        df["transaction_date"] = (
            pd.to_datetime(
                df["transaction_date"]
            )
        )


        df["total_amount"] = (
            pd.to_numeric(
                df["total_amount"],
                errors="raise"
            )
        )


        reference_timestamp = (
            pd.Timestamp(
                reference_date
            )
        )

        # Validate future transaction
        future_rows = df[
            df["transaction_date"]
            >
            reference_timestamp
        ]


        if not future_rows.empty:

            raise ValueError(
                "Terdapat transaksi setelah "
                "reference_date."
            )

        # RFM Aggregation
        rfm = (
            df
            .groupby(
                "customer_id"
            )
            .agg(
                Transaksi_Terakhir=(
                    "transaction_date",
                    "max"
                ),

                Frequency=(
                    "transaction_id",
                    "nunique"
                ),

                Monetary=(
                    "total_amount",
                    "sum"
                )
            )
            .reset_index()
        )

        # RECENCY
        rfm["Recency"] = (
            reference_timestamp
            -
            rfm[
                "Transaksi_Terakhir"
            ]
        ).dt.days

        rfm = rfm.reset_index(
    drop=True
)


        if (
            rfm["Recency"] < 0
        ).any():

            raise ValueError(
                "Recency negatif terdeteksi."
            )


        # Ensure feature order
        feature_df = (
            rfm[
                self.FEATURE_COLUMNS
            ]
            .astype(float)
        )


        # StandardScaler
        scaled_data = (
            model_service
            .scaler
            .transform(
                feature_df
            )
        )

        # K-Means Prediction
        clusters = (
            model_service
            .model
            .predict(
                scaled_data
            )
        )


        rfm["Cluster"] = (
            clusters.astype(int)
        )

        # Evaluation
        unique_clusters = (
            len(
                set(
                    clusters.tolist()
                )
            )
        )

        sample_count = (
            len(rfm)
        )


        silhouette_values = [
            None
        ] * sample_count


        silhouette_metric = None
        dbi_metric = None
        ch_metric = None


        if (
            unique_clusters >= 2
            and
            unique_clusters < sample_count
        ):

            silhouette_array = (
                silhouette_samples(
                    scaled_data,
                    clusters
                )
            )


            silhouette_values = [
                float(value)
                for value
                in silhouette_array
            ]


            silhouette_metric = float(
                silhouette_score(
                    scaled_data,
                    clusters
                )
            )


            dbi_metric = float(
                davies_bouldin_score(
                    scaled_data,
                    clusters
                )
            )


            ch_metric = float(
                calinski_harabasz_score(
                    scaled_data,
                    clusters
                )
            )

        # Cluster Business Segment
        mapping = (
            model_service
            .metadata[
                "cluster_mapping"
            ]
        )


        results = []


        for index, row in (
            rfm.iterrows()
        ):

            cluster = int(
                row["Cluster"]
            )


            segment = (
                mapping[
                    str(cluster)
                ]
            )


            results.append(
                {
                    "customer_id":
                        int(
                            row[
                                "customer_id"
                            ]
                        ),

                    "last_transaction_date":
                        row[
                            "Transaksi_Terakhir"
                        ].date(),

                    "recency":
                        int(
                            row[
                                "Recency"
                            ]
                        ),

                    "frequency":
                        int(
                            row[
                                "Frequency"
                            ]
                        ),

                    "monetary":
                        float(
                            row[
                                "Monetary"
                            ]
                        ),

                    "cluster":
                        cluster,

                    "segment_code":
                        segment[
                            "code"
                        ],

                    "segment_name":
                        segment[
                            "name"
                        ],

                    "silhouette_value":
                        silhouette_values[
                            index
                        ]
                }
            )

        # Stable output order
        results.sort(
            key=lambda item:
                item[
                    "customer_id"
                ]
        )


        return {
            "reference_date":
                reference_date,

            "total_customers":
                len(results),

            "total_transactions":
                len(df),

            "model_version":
                model_service
                .metadata[
                    "model_version"
                ],

            "metrics": {
                "silhouette_score":
                    silhouette_metric,

                "davies_bouldin_index":
                    dbi_metric,

                "calinski_harabasz_score":
                    ch_metric
            },

            "results":
                results
        }


rfm_service = RFMService()